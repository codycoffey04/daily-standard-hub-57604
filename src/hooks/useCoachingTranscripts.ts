import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { extractTextFromPdf } from '@/utils/pdfExtractor'
import type { UploadedFile } from '@/components/coaching/TranscriptUploader'
import type { Database } from '@/integrations/supabase/types'

type CoachingTranscript = Database['public']['Tables']['coaching_transcripts']['Row']
type Producer = Database['public']['Tables']['producers']['Row']
type CoachingType = 'sales' | 'service'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000 // Base delay, doubles each retry

// Generic team member interface for both producers and CSRs
interface TeamMember {
  id: string
  display_name: string
}

function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0]
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function useCoachingTranscripts(weekStart: Date, coachingType: CoachingType = 'sales') {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const weekStartStr = formatDateForDB(weekStart)

  // Track local file state per team member (producer or CSR)
  const [filesByMember, setFilesByMember] = useState<Record<string, UploadedFile[]>>({})

  // Fetch team members based on coaching type
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', coachingType],
    queryFn: async (): Promise<TeamMember[]> => {
      if (coachingType === 'sales') {
        const { data, error } = await supabase
          .from('producers')
          .select('id, display_name')
          .eq('active', true)
          .order('display_name')

        if (error) throw error
        return data as TeamMember[]
      } else {
        // Service mode - fetch CSR profiles
        const { data, error } = await supabase
          .from('csr_profiles')
          .select('id, display_name')
          .eq('active', true)
          .order('display_name')

        if (error) throw error
        return data as TeamMember[]
      }
    }
  })

  // Fetch existing transcripts for this week and coaching type
  const {
    data: existingTranscripts = [],
    isLoading: isLoadingTranscripts
  } = useQuery({
    queryKey: ['coaching-transcripts', weekStartStr, coachingType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_transcripts')
        .select('*')
        .eq('week_start', weekStartStr)
        .eq('coaching_type', coachingType)

      if (error) throw error
      return data as CoachingTranscript[]
    }
  })

  // Initialize file state from existing transcripts when they load
  useEffect(() => {
    if (existingTranscripts.length > 0 && teamMembers.length > 0) {
      const initialState: Record<string, UploadedFile[]> = {}

      teamMembers.forEach(member => {
        // Filter transcripts based on coaching type
        const memberTranscripts = existingTranscripts.filter(t =>
          coachingType === 'sales'
            ? t.producer_id === member.id
            : (t as any).csr_profile_id === member.id
        )

        initialState[member.id] = memberTranscripts.map(t => ({
          id: t.id,
          file: new File([], t.file_name, { type: 'application/pdf' }),
          status: 'completed' as const,
          progress: 100,
          storagePath: t.file_path,
          extractionStatus: (t.extraction_status as UploadedFile['extractionStatus']) || 'pending',
          storedFileSize: t.file_size ?? undefined
        }))
      })

      setFilesByMember(initialState)
    }
  }, [existingTranscripts, teamMembers, coachingType])

  // Reset state when week or coaching type changes
  useEffect(() => {
    setFilesByMember({})
  }, [weekStartStr, coachingType])

  // Helper to update file status
  const updateFileStatus = useCallback((
    memberId: string,
    localId: string,
    updates: Partial<UploadedFile>
  ) => {
    setFilesByMember(prev => ({
      ...prev,
      [memberId]: (prev[memberId] || []).map(f =>
        f.id === localId ? { ...f, ...updates } : f
      )
    }))
  }, [])

  // Upload with retry logic
  const uploadWithRetry = async (
    storagePath: string,
    blob: Blob,
    retries = MAX_RETRIES
  ): Promise<void> => {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { error } = await supabase.storage
          .from('coaching-transcripts')
          .upload(storagePath, blob, { upsert: true })

        if (error) throw error
        return // Success
      } catch (error) {
        lastError = error as Error
        console.log(`[Upload] Attempt ${attempt}/${retries} failed:`, lastError.message)

        if (attempt < retries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }

    throw lastError
  }

  // Process a single file: extract text, upload, create record
  const processFile = useCallback(async (
    memberId: string,
    file: File,
    localId: string
  ): Promise<boolean> => {
    try {
      // Step 1: Extract text from PDF (this is the heavy lifting)
      updateFileStatus(memberId, localId, {
        status: 'uploading' as const,
        progress: 5,
        extractionStatus: 'extracting' as const
      })

      console.log(`[Upload] Extracting text from: ${file.name}`)
      const { text, pageCount, originalSize, extractedSize } = await extractTextFromPdf(file)

      updateFileStatus(memberId, localId, { progress: 40 })

      // Step 2: Create text blob and upload (much smaller than original PDF)
      const textBlob = new Blob([text], { type: 'text/plain' })
      const textFileName = file.name.replace(/\.pdf$/i, '.txt')
      const storagePath = `${coachingType}/${memberId}/${weekStartStr}/${textFileName}`

      console.log(`[Upload] Uploading extracted text: ${textFileName} (${(extractedSize / 1024).toFixed(1)} KB)`)
      updateFileStatus(memberId, localId, { progress: 50 })

      await uploadWithRetry(storagePath, textBlob)

      updateFileStatus(memberId, localId, { progress: 80 })

      // Step 3: Create transcript record
      const insertData: Record<string, any> = {
        week_start: weekStartStr,
        coaching_type: coachingType,
        file_name: file.name, // Keep original PDF name for display
        file_path: storagePath,
        file_size: extractedSize, // Store extracted size, not original
        extracted_text: text, // Store the extracted text
        extraction_status: 'completed',
        uploaded_by: user?.id
      }

      if (coachingType === 'sales') {
        insertData.producer_id = memberId
        insertData.csr_profile_id = null
      } else {
        insertData.producer_id = null
        insertData.csr_profile_id = memberId
      }

      const { data: transcript, error: insertError } = await supabase
        .from('coaching_transcripts')
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        console.error('[Upload] DB insert error:', insertError)
        throw insertError
      }

      console.log(`[Upload] Success: ${file.name} → ${textFileName} (${(originalSize / 1024 / 1024).toFixed(1)} MB → ${(extractedSize / 1024).toFixed(1)} KB)`)

      // Update to completed
      updateFileStatus(memberId, localId, {
        id: transcript.id,
        status: 'completed' as const,
        progress: 100,
        storagePath,
        extractionStatus: 'completed' as const,
        storedFileSize: extractedSize
      })

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      console.error(`[Upload] Failed: ${file.name}`, error)

      updateFileStatus(memberId, localId, {
        status: 'error' as const,
        error: errorMessage,
        extractionStatus: 'failed' as const
      })

      toast({
        title: 'Upload failed',
        description: `${file.name}: ${errorMessage}`,
        variant: 'destructive'
      })

      return false
    }
  }, [weekStartStr, coachingType, user?.id, updateFileStatus, toast])

  // Track if we're currently processing uploads for a member (prevent double-processing)
  const processingRef = useRef<Set<string>>(new Set())

  // Handle files selected for a team member - processes sequentially with retry
  const handleFilesSelected = useCallback(async (memberId: string, files: File[]) => {
    // Prevent double-processing if user drops files while upload is in progress
    if (processingRef.current.has(memberId)) {
      console.log(`[Upload] Already processing for ${memberId}, queuing files`)
    }

    const newFiles: UploadedFile[] = files.map(file => ({
      id: generateId(),
      file,
      status: 'pending' as const,
      progress: 0,
      extractionStatus: 'pending' as const
    }))

    // Add files to state immediately (shows pending UI)
    setFilesByMember(prev => ({
      ...prev,
      [memberId]: [...(prev[memberId] || []), ...newFiles]
    }))

    // Process files SEQUENTIALLY (not in parallel)
    // This prevents network congestion and race conditions
    processingRef.current.add(memberId)

    try {
      for (const f of newFiles) {
        console.log(`[Upload] Processing file ${newFiles.indexOf(f) + 1}/${newFiles.length}: ${f.file.name}`)
        await processFile(memberId, f.file, f.id)
        // Small delay between files to let UI update
        await new Promise(r => setTimeout(r, 100))
      }

      // Refresh transcript list after all uploads complete
      queryClient.invalidateQueries({ queryKey: ['coaching-transcripts', weekStartStr, coachingType] })

      toast({
        title: 'Transcripts uploaded',
        description: `${newFiles.length} transcript${newFiles.length > 1 ? 's' : ''} processed successfully`
      })
    } finally {
      processingRef.current.delete(memberId)
    }
  }, [processFile, queryClient, weekStartStr, coachingType, toast])

  // Remove file (and delete from storage/DB if already uploaded)
  const handleRemoveFile = useCallback(async (memberId: string, fileId: string) => {
    const files = filesByMember[memberId] || []
    const file = files.find(f => f.id === fileId)

    if (file?.storagePath) {
      // Delete from storage
      await supabase.storage
        .from('coaching-transcripts')
        .remove([file.storagePath])

      // Delete from database
      await supabase
        .from('coaching_transcripts')
        .delete()
        .eq('id', fileId)

      queryClient.invalidateQueries({ queryKey: ['coaching-transcripts', weekStartStr, coachingType] })
    }

    setFilesByMember(prev => ({
      ...prev,
      [memberId]: (prev[memberId] || []).filter(f => f.id !== fileId)
    }))
  }, [filesByMember, weekStartStr, coachingType, queryClient])

  // Check if all team members have 3 completed transcripts
  const allTranscriptsReady = teamMembers.every(member => {
    const files = filesByMember[member.id] || []
    const completedCount = files.filter(f => f.status === 'completed').length
    return completedCount >= 3
  })

  // Get ready status per team member
  const getMemberReadyStatus = (memberId: string): boolean => {
    const files = filesByMember[memberId] || []
    return files.filter(f => f.status === 'completed').length >= 3
  }

  return {
    // Backwards compatibility: expose as both 'producers' and 'teamMembers'
    producers: teamMembers,
    teamMembers,
    filesByProducer: filesByMember, // Backwards compatibility
    filesByMember,
    isLoadingTranscripts,
    handleFilesSelected,
    handleRemoveFile,
    allTranscriptsReady,
    getProducerReadyStatus: getMemberReadyStatus, // Backwards compatibility
    getMemberReadyStatus,
    coachingType
  }
}

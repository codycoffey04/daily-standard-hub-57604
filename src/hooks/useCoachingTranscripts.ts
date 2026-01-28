import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { compressPdf } from '@/utils/pdfCompressor'
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

  // Compression threshold: only compress files larger than 5MB
  const COMPRESSION_THRESHOLD = 5 * 1024 * 1024 // 5MB

  // Process a single file: compress if large, then upload PDF (Claude reads PDFs natively)
  const processFile = useCallback(async (
    memberId: string,
    file: File,
    localId: string
  ): Promise<boolean> => {
    try {
      let fileToUpload = file
      const needsCompression = file.size > COMPRESSION_THRESHOLD
      const isVeryLarge = file.size > 50 * 1024 * 1024 // 50MB+
      const isLarge = file.size > 20 * 1024 * 1024 // 20MB+

      // Compress large files before upload
      if (needsCompression) {
        // Show warning for very large files
        const statusMessage = isVeryLarge
          ? 'Large file - compression may take 2-5 minutes'
          : isLarge
          ? 'Compressing large file...'
          : undefined

        updateFileStatus(memberId, localId, {
          status: 'uploading' as const,
          progress: 5,
          statusMessage
        })

        console.log(`[Compress] Starting: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`)

        try {
          const result = await compressPdf(file, 0.6, 0.65, (percent) => {
            // Progress 5-30% during compression
            updateFileStatus(memberId, localId, { progress: 5 + Math.round(percent * 0.25) })
          })

          fileToUpload = result.file
          console.log(`[Compress] Done: ${(result.originalSize / 1024 / 1024).toFixed(1)}MB → ${(result.compressedSize / 1024 / 1024).toFixed(1)}MB (${result.reductionPercent}% reduction)`)
        } catch (compressionError) {
          // Fallback: upload original if compression fails
          console.warn('[Compress] Failed, uploading original:', compressionError)
          fileToUpload = file
        }
      }

      // Upload (compressed or original)
      // Start at 30% if we compressed, 10% if we didn't (so small files don't briefly show "Compressing...")
      // Clear the status message since compression is done
      updateFileStatus(memberId, localId, {
        status: 'uploading' as const,
        progress: needsCompression ? 30 : 10,
        statusMessage: undefined
      })

      const storagePath = `${coachingType}/${memberId}/${weekStartStr}/${file.name}`

      console.log(`[Upload] Uploading PDF: ${file.name} (${(fileToUpload.size / 1024 / 1024).toFixed(1)} MB)`)
      updateFileStatus(memberId, localId, { progress: needsCompression ? 50 : 40 })

      await uploadWithRetry(storagePath, fileToUpload)

      updateFileStatus(memberId, localId, { progress: 80 })

      // Create transcript record (no extracted_text - Claude reads PDFs natively)
      const insertData: Record<string, any> = {
        week_start: weekStartStr,
        coaching_type: coachingType,
        file_name: file.name,
        file_path: storagePath,
        file_size: fileToUpload.size, // Store compressed size
        extracted_text: null, // Claude reads PDFs natively
        extraction_status: 'completed', // No extraction needed - Claude reads PDFs natively
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

      console.log(`[Upload] Success: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`)

      // Update to completed
      updateFileStatus(memberId, localId, {
        id: transcript.id,
        status: 'completed' as const,
        progress: 100,
        storagePath,
        storedFileSize: fileToUpload.size // Store actual uploaded size (compressed if applicable)
      })

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      console.error(`[Upload] Failed: ${file.name}`, error)

      updateFileStatus(memberId, localId, {
        status: 'error' as const,
        error: errorMessage
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

    let successCount = 0
    let failCount = 0

    try {
      for (const f of newFiles) {
        console.log(`[Upload] Processing file ${newFiles.indexOf(f) + 1}/${newFiles.length}: ${f.file.name}`)
        const success = await processFile(memberId, f.file, f.id)
        if (success) {
          successCount++
        } else {
          failCount++
        }
        // Small delay between files to let UI update
        await new Promise(r => setTimeout(r, 100))
      }

      // Refresh transcript list after all uploads complete
      queryClient.invalidateQueries({ queryKey: ['coaching-transcripts', weekStartStr, coachingType] })

      // Only show success toast if at least one succeeded
      if (successCount > 0) {
        toast({
          title: 'Transcripts uploaded',
          description: `${successCount} transcript${successCount > 1 ? 's' : ''} uploaded successfully${failCount > 0 ? ` (${failCount} failed)` : ''}`
        })
      }
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

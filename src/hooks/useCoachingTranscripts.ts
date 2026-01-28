import { useState, useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import type { UploadedFile } from '@/components/coaching/TranscriptUploader'
import type { Database } from '@/integrations/supabase/types'

type CoachingTranscript = Database['public']['Tables']['coaching_transcripts']['Row']
type Producer = Database['public']['Tables']['producers']['Row']
type CoachingType = 'sales' | 'service'

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

  // Upload file to storage and create transcript record
  const uploadFile = useCallback(async (
    memberId: string,
    file: File,
    localId: string
  ): Promise<void> => {
    // Storage path includes coaching type to prevent collisions
    const storagePath = `${coachingType}/${memberId}/${weekStartStr}/${file.name}`

    // Update status to uploading
    setFilesByMember(prev => ({
      ...prev,
      [memberId]: (prev[memberId] || []).map(f =>
        f.id === localId ? { ...f, status: 'uploading' as const, progress: 10 } : f
      )
    }))

    try {
      // Step 1: Upload to storage (no client-side extraction - Claude reads PDFs directly)
      setFilesByMember(prev => ({
        ...prev,
        [memberId]: (prev[memberId] || []).map(f =>
          f.id === localId ? { ...f, progress: 30 } : f
        )
      }))

      const { error: uploadError } = await supabase.storage
        .from('coaching-transcripts')
        .upload(storagePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Update progress
      setFilesByMember(prev => ({
        ...prev,
        [memberId]: (prev[memberId] || []).map(f =>
          f.id === localId ? { ...f, progress: 70 } : f
        )
      }))

      // Step 2: Create transcript record (extraction happens server-side via Claude)
      // Set the appropriate ID field based on coaching type
      const insertData: Record<string, any> = {
        week_start: weekStartStr,
        coaching_type: coachingType,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        extracted_text: null, // Not used - Claude reads PDFs directly
        extraction_status: 'completed', // Mark as completed - Claude reads PDFs directly during generation
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
        console.error('[useCoachingTranscripts] Insert error:', insertError)
        throw insertError
      }

      console.log(`[useCoachingTranscripts] Upload successful, transcript id: ${transcript.id}`)

      // Update to completed
      setFilesByMember(prev => ({
        ...prev,
        [memberId]: (prev[memberId] || []).map(f =>
          f.id === localId
            ? {
                ...f,
                id: transcript.id,
                status: 'completed' as const,
                progress: 100,
                storagePath,
                extractionStatus: 'completed' as const
              }
            : f
        )
      }))

      queryClient.invalidateQueries({ queryKey: ['coaching-transcripts', weekStartStr, coachingType] })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'

      setFilesByMember(prev => ({
        ...prev,
        [memberId]: (prev[memberId] || []).map(f =>
          f.id === localId
            ? { ...f, status: 'error' as const, error: errorMessage }
            : f
        )
      }))

      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [weekStartStr, coachingType, user?.id, queryClient, toast])

  // Handle files selected for a team member
  const handleFilesSelected = useCallback((memberId: string, files: File[]) => {
    const newFiles: UploadedFile[] = files.map(file => ({
      id: generateId(),
      file,
      status: 'pending' as const,
      progress: 0
    }))

    setFilesByMember(prev => ({
      ...prev,
      [memberId]: [...(prev[memberId] || []), ...newFiles]
    }))

    // Start uploading each file
    newFiles.forEach(f => {
      uploadFile(memberId, f.file, f.id)
    })
  }, [uploadFile])

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

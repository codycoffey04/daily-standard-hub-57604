import { useState, useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import type { UploadedFile } from '@/components/coaching/TranscriptUploader'
import type { Database } from '@/integrations/supabase/types'

type CoachingTranscript = Database['public']['Tables']['coaching_transcripts']['Row']
type Producer = Database['public']['Tables']['producers']['Row']

function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0]
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function useCoachingTranscripts(weekStart: Date) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const weekStartStr = formatDateForDB(weekStart)

  // Track local file state per producer
  const [filesByProducer, setFilesByProducer] = useState<Record<string, UploadedFile[]>>({})

  // Fetch producers
  const { data: producers = [] } = useQuery({
    queryKey: ['producers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producers')
        .select('*')
        .eq('active', true)
        .order('display_name')

      if (error) throw error
      return data as Producer[]
    }
  })

  // Fetch existing transcripts for this week
  const {
    data: existingTranscripts = [],
    isLoading: isLoadingTranscripts
  } = useQuery({
    queryKey: ['coaching-transcripts', weekStartStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_transcripts')
        .select('*')
        .eq('week_start', weekStartStr)

      if (error) throw error
      return data as CoachingTranscript[]
    }
  })

  // Initialize file state from existing transcripts when they load
  useEffect(() => {
    if (existingTranscripts.length > 0 && producers.length > 0) {
      const initialState: Record<string, UploadedFile[]> = {}

      producers.forEach(producer => {
        const producerTranscripts = existingTranscripts.filter(
          t => t.producer_id === producer.id
        )

        initialState[producer.id] = producerTranscripts.map(t => ({
          id: t.id,
          file: new File([], t.file_name, { type: 'application/pdf' }),
          status: 'completed' as const,
          progress: 100,
          storagePath: t.file_path,
          extractionStatus: (t.extraction_status as UploadedFile['extractionStatus']) || 'pending'
        }))
      })

      setFilesByProducer(initialState)
    }
  }, [existingTranscripts, producers])

  // Reset state when week changes
  useEffect(() => {
    setFilesByProducer({})
  }, [weekStartStr])

  // Upload file to storage and create transcript record
  const uploadFile = useCallback(async (
    producerId: string,
    file: File,
    localId: string
  ): Promise<void> => {
    const storagePath = `${producerId}/${weekStartStr}/${file.name}`

    // Update status to uploading
    setFilesByProducer(prev => ({
      ...prev,
      [producerId]: (prev[producerId] || []).map(f =>
        f.id === localId ? { ...f, status: 'uploading' as const, progress: 10 } : f
      )
    }))

    try {
      // Step 1: Upload to storage (no client-side extraction - Claude reads PDFs directly)
      setFilesByProducer(prev => ({
        ...prev,
        [producerId]: (prev[producerId] || []).map(f =>
          f.id === localId ? { ...f, progress: 30 } : f
        )
      }))

      const { error: uploadError } = await supabase.storage
        .from('coaching-transcripts')
        .upload(storagePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Update progress
      setFilesByProducer(prev => ({
        ...prev,
        [producerId]: (prev[producerId] || []).map(f =>
          f.id === localId ? { ...f, progress: 70 } : f
        )
      }))

      // Step 2: Create transcript record (extraction happens server-side via Claude)
      const { data: transcript, error: insertError } = await supabase
        .from('coaching_transcripts')
        .insert({
          producer_id: producerId,
          week_start: weekStartStr,
          file_name: file.name,
          file_path: storagePath,
          file_size: file.size,
          extracted_text: null, // Not used - Claude reads PDFs directly
          extraction_status: 'skipped', // Client-side extraction skipped
          uploaded_by: user?.id
        })
        .select()
        .single()

      if (insertError) {
        console.error('[useCoachingTranscripts] Insert error:', insertError)
        throw insertError
      }

      console.log(`[useCoachingTranscripts] Upload successful, transcript id: ${transcript.id}`)

      // Update to completed
      setFilesByProducer(prev => ({
        ...prev,
        [producerId]: (prev[producerId] || []).map(f =>
          f.id === localId
            ? {
                ...f,
                id: transcript.id,
                status: 'completed' as const,
                progress: 100,
                storagePath,
                extractionStatus: 'skipped' as const
              }
            : f
        )
      }))

      queryClient.invalidateQueries({ queryKey: ['coaching-transcripts', weekStartStr] })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'

      setFilesByProducer(prev => ({
        ...prev,
        [producerId]: (prev[producerId] || []).map(f =>
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
  }, [weekStartStr, user?.id, queryClient, toast])

  // Handle files selected for a producer
  const handleFilesSelected = useCallback((producerId: string, files: File[]) => {
    const newFiles: UploadedFile[] = files.map(file => ({
      id: generateId(),
      file,
      status: 'pending' as const,
      progress: 0
    }))

    setFilesByProducer(prev => ({
      ...prev,
      [producerId]: [...(prev[producerId] || []), ...newFiles]
    }))

    // Start uploading each file
    newFiles.forEach(f => {
      uploadFile(producerId, f.file, f.id)
    })
  }, [uploadFile])

  // Remove file (and delete from storage/DB if already uploaded)
  const handleRemoveFile = useCallback(async (producerId: string, fileId: string) => {
    const files = filesByProducer[producerId] || []
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

      queryClient.invalidateQueries({ queryKey: ['coaching-transcripts', weekStartStr] })
    }

    setFilesByProducer(prev => ({
      ...prev,
      [producerId]: (prev[producerId] || []).filter(f => f.id !== fileId)
    }))
  }, [filesByProducer, weekStartStr, queryClient])

  // Check if all producers have 3 completed transcripts
  const allTranscriptsReady = producers.every(producer => {
    const files = filesByProducer[producer.id] || []
    const completedCount = files.filter(f => f.status === 'completed').length
    return completedCount >= 3
  })

  // Get ready status per producer
  const getProducerReadyStatus = (producerId: string): boolean => {
    const files = filesByProducer[producerId] || []
    return files.filter(f => f.status === 'completed').length >= 3
  }

  return {
    producers,
    filesByProducer,
    isLoadingTranscripts,
    handleFilesSelected,
    handleRemoveFile,
    allTranscriptsReady,
    getProducerReadyStatus
  }
}

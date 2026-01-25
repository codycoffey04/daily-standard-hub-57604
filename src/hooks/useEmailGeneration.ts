import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Database } from '@/integrations/supabase/types'

type EmailUpdate = Database['public']['Tables']['email_updates']['Row']

interface GenerateEmailParams {
  emailMetricsId: string
  emailType: 'weekly' | 'monthly'
  announcements?: string
  compareWithPreviousPeriod?: boolean
}

interface GenerateEmailResult {
  success: boolean
  emailId?: string
  subject_line?: string
  html_content?: string
  markdown_content?: string
  tokensUsed?: number
  generationDurationMs?: number
  error?: string
}

export function useEmailGeneration(periodStart: string, emailType: 'weekly' | 'monthly') {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle')
  const [generatedEmail, setGeneratedEmail] = useState<{
    subject_line: string
    html_content: string
    markdown_content: string
  } | null>(null)

  // Fetch existing email for this period
  const {
    data: existingEmail,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['email-update', emailType, periodStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_updates')
        .select('*')
        .eq('email_type', emailType)
        .eq('period_start', periodStart)
        .maybeSingle()

      if (error) throw error
      return data as EmailUpdate | null
    },
    enabled: !!periodStart
  })

  // Generate email mutation
  const generateMutation = useMutation({
    mutationFn: async (params: GenerateEmailParams): Promise<GenerateEmailResult> => {
      setGenerationStatus('generating')
      setGeneratedEmail(null)

      const { data, error } = await supabase.functions.invoke('generate-email-update', {
        body: params
      })

      if (error) throw error
      return data as GenerateEmailResult
    },
    onSuccess: (data) => {
      if (data.success && data.html_content) {
        setGenerationStatus('completed')
        setGeneratedEmail({
          subject_line: data.subject_line || '',
          html_content: data.html_content,
          markdown_content: data.markdown_content || ''
        })
        toast({
          title: 'Email generated',
          description: `Generated in ${((data.generationDurationMs || 0) / 1000).toFixed(1)}s using ${data.tokensUsed} tokens.`
        })
        queryClient.invalidateQueries({ queryKey: ['email-update', emailType, periodStart] })
        queryClient.invalidateQueries({ queryKey: ['email-archive'] })
      } else {
        setGenerationStatus('error')
        toast({
          title: 'Generation failed',
          description: data.error || 'Unknown error',
          variant: 'destructive'
        })
      }
    },
    onError: (error: Error) => {
      setGenerationStatus('error')
      toast({
        title: 'Error generating email',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  const generateEmail = (params: GenerateEmailParams) => {
    generateMutation.mutate(params)
  }

  // Reset state
  const reset = () => {
    setGenerationStatus('idle')
    setGeneratedEmail(null)
  }

  return {
    existingEmail,
    isLoading,
    error,
    generationStatus,
    generatedEmail,
    isGenerating: generateMutation.isPending,
    generateEmail,
    reset,
    refetch
  }
}

// Archive hook for listing all generated emails
export function useEmailArchive() {
  return useQuery({
    queryKey: ['email-archive'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_updates')
        .select('*')
        .order('period_start', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as EmailUpdate[]
    }
  })
}

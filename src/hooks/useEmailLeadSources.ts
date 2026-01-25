import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  parseAgencyZoomLeadSourceCSV,
  combineSourcesByMapping,
  type LeadSourceMetrics,
  type SourceMapping
} from '@/utils/metricsParser'
import type { Database } from '@/integrations/supabase/types'

type EmailLeadSourceMetrics = Database['public']['Tables']['email_lead_source_metrics']['Row']
type EmailLeadSourceMetricsInsert = Database['public']['Tables']['email_lead_source_metrics']['Insert']

interface ParsedSourceWithMapping extends LeadSourceMetrics {
  mapped_source_name: string
  is_csr: boolean
  attributed_to?: string
}

export function useEmailLeadSources(emailMetricsId: string | undefined) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [rawLeadSourcePaste, setRawLeadSourcePaste] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  // Fetch source mappings configuration
  const { data: sourceMappingsConfig } = useQuery({
    queryKey: ['email-source-mappings-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_framework_config')
        .select('config_data')
        .eq('config_type', 'email_source_mappings')
        .eq('active', true)
        .maybeSingle()

      if (error) throw error
      return data?.config_data as { mappings: SourceMapping[] } | null
    }
  })

  const sourceMappings = sourceMappingsConfig?.mappings || []

  // Fetch existing lead source metrics for this email_metrics record
  const {
    data: leadSources,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['email-lead-sources', emailMetricsId],
    queryFn: async () => {
      if (!emailMetricsId) return []

      const { data, error } = await supabase
        .from('email_lead_source_metrics')
        .select('*')
        .eq('email_metrics_id', emailMetricsId)
        .order('items', { ascending: false })

      if (error) throw error
      return data as EmailLeadSourceMetrics[]
    },
    enabled: !!emailMetricsId
  })

  // Parse raw paste and apply mappings
  const parsedLeadSources = useMemo<ParsedSourceWithMapping[] | null>(() => {
    if (!rawLeadSourcePaste.trim()) {
      return null
    }

    const result = parseAgencyZoomLeadSourceCSV(rawLeadSourcePaste)
    if (!result.success || !result.data) {
      return null
    }

    // Apply source mappings and combine
    return combineSourcesByMapping(result.data.sources, sourceMappings)
  }, [rawLeadSourcePaste, sourceMappings])

  // Update parse error state separately to avoid infinite loop
  useEffect(() => {
    if (!rawLeadSourcePaste.trim()) {
      setParseError(null)
      return
    }

    const result = parseAgencyZoomLeadSourceCSV(rawLeadSourcePaste)
    if (!result.success || !result.data) {
      setParseError(result.error || 'Failed to parse lead source data')
    } else {
      setParseError(null)
    }
  }, [rawLeadSourcePaste])

  // Calculate totals from parsed data
  const parsedTotals = useMemo(() => {
    if (!parsedLeadSources) return null

    return parsedLeadSources.reduce(
      (acc, source) => ({
        items: acc.items + source.items,
        premium: acc.premium + source.premium,
        policies: acc.policies + source.policies,
        sales: acc.sales + source.sales,
        points: acc.points + source.points
      }),
      { items: 0, premium: 0, policies: 0, sales: 0, points: 0 }
    )
  }, [parsedLeadSources])

  // Calculate CSR totals
  const csrTotals = useMemo(() => {
    if (!parsedLeadSources) return null

    const csrSources = parsedLeadSources.filter(s => s.is_csr)
    if (csrSources.length === 0) return null

    return {
      sources: csrSources,
      totals: csrSources.reduce(
        (acc, source) => ({
          items: acc.items + source.items,
          premium: acc.premium + source.premium
        }),
        { items: 0, premium: 0 }
      )
    }
  }, [parsedLeadSources])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!emailMetricsId) {
        throw new Error('No email metrics record. Save production metrics first.')
      }

      if (!parsedLeadSources || parsedLeadSources.length === 0) {
        throw new Error('No valid lead source data to save')
      }

      // Delete existing lead sources for this metrics record
      const { error: deleteError } = await supabase
        .from('email_lead_source_metrics')
        .delete()
        .eq('email_metrics_id', emailMetricsId)

      if (deleteError) throw deleteError

      // Insert new lead sources
      const inserts: EmailLeadSourceMetricsInsert[] = parsedLeadSources.map(source => ({
        email_metrics_id: emailMetricsId,
        source_name_raw: source.source_name_raw,
        mapped_source_name: source.mapped_source_name,
        items: source.items,
        premium: source.premium,
        policies: source.policies,
        sales: source.sales,
        points: source.points,
        is_csr_source: source.is_csr,
        attributed_to: source.attributed_to || null
      }))

      const { error: insertError } = await supabase
        .from('email_lead_source_metrics')
        .insert(inserts)

      if (insertError) throw insertError

      // Also update the raw_lead_source_paste on email_metrics
      const { error: updateError } = await supabase
        .from('email_metrics')
        .update({ raw_lead_source_paste: rawLeadSourcePaste })
        .eq('id', emailMetricsId)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      toast({
        title: 'Lead sources saved',
        description: `${parsedLeadSources?.length || 0} lead sources saved successfully.`
      })
      setRawLeadSourcePaste('')
      queryClient.invalidateQueries({ queryKey: ['email-lead-sources', emailMetricsId] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error saving lead sources',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  return {
    leadSources,
    isLoading,
    error,
    rawLeadSourcePaste,
    setRawLeadSourcePaste,
    parsedLeadSources,
    parsedTotals,
    csrTotals,
    parseError,
    sourceMappings,
    saveLeadSources: () => saveMutation.mutate(),
    isSaving: saveMutation.isPending,
    refetch
  }
}

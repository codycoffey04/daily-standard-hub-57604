import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { parseAgencyZoomMetrics, type ParsedMetrics } from '@/utils/metricsParser'
import type { Database } from '@/integrations/supabase/types'

type CoachingMetrics = Database['public']['Tables']['coaching_metrics']['Row']
type CoachingMetricsInsert = Database['public']['Tables']['coaching_metrics']['Insert']
type CoachingType = 'sales' | 'service'

function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Hook for managing coaching metrics.
 * Note: Metrics are only relevant for sales coaching mode.
 * For service coaching, this hook returns isSkipped: true and empty data.
 */
export function useCoachingMetrics(weekStart: Date, coachingType: CoachingType = 'sales') {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [rawPaste, setRawPaste] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  const weekStartStr = formatDateForDB(weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekEndStr = formatDateForDB(weekEnd)

  // Service mode doesn't use metrics - CSRs don't have production data
  const isSkipped = coachingType === 'service'

  // Fetch existing metrics for this week (only for sales mode)
  const {
    data: metrics,
    isLoading,
    error
  } = useQuery({
    queryKey: ['coaching-metrics', weekStartStr, coachingType],
    queryFn: async () => {
      // Service mode doesn't need metrics
      if (isSkipped) return null

      const { data, error } = await supabase
        .from('coaching_metrics')
        .select('*')
        .eq('week_start', weekStartStr)
        .eq('coaching_type', 'sales')
        .maybeSingle()

      if (error) throw error
      return data as CoachingMetrics | null
    },
    enabled: !isSkipped
  })

  // Parse raw paste on change
  const parsedMetrics = useMemo<ParsedMetrics | null>(() => {
    if (!rawPaste.trim()) {
      setParseError(null)
      return null
    }

    const result = parseAgencyZoomMetrics(rawPaste)
    if (!result.success) {
      setParseError(result.error || 'Failed to parse metrics')
      return null
    }

    setParseError(null)
    return result.data || null
  }, [rawPaste])

  // Reset raw paste when week changes and we have saved metrics
  useEffect(() => {
    if (metrics) {
      setRawPaste('')
      setParseError(null)
    }
  }, [metrics])

  // Save/update mutation (only for sales mode)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isSkipped) {
        throw new Error('Metrics are not applicable for service coaching')
      }

      if (!parsedMetrics) {
        throw new Error('No valid metrics to save')
      }

      const metricsData: CoachingMetricsInsert = {
        week_start: weekStartStr,
        week_end: weekEndStr,
        coaching_type: 'sales',
        raw_paste: rawPaste,
        producer_metrics: parsedMetrics.producers as unknown as Database['public']['Tables']['coaching_metrics']['Insert']['producer_metrics'],
        team_qhh: parsedMetrics.team.qhh,
        team_quotes: parsedMetrics.team.quotes,
        team_sales: parsedMetrics.team.sales,
        team_items: parsedMetrics.team.items,
        team_premium: parsedMetrics.team.premium,
        team_close_rate: parsedMetrics.team.close_rate,
        created_by: user?.id
      }

      if (metrics) {
        // Update existing
        const { error } = await supabase
          .from('coaching_metrics')
          .update(metricsData)
          .eq('id', metrics.id)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('coaching_metrics')
          .insert(metricsData)

        if (error) throw error
      }
    },
    onSuccess: () => {
      toast({
        title: 'Metrics saved',
        description: `Weekly metrics for ${weekStartStr} saved successfully.`
      })
      setRawPaste('')
      queryClient.invalidateQueries({ queryKey: ['coaching-metrics', weekStartStr, coachingType] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error saving metrics',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  return {
    metrics,
    isLoading: isSkipped ? false : isLoading,
    error: isSkipped ? null : error,
    rawPaste,
    setRawPaste,
    parsedMetrics,
    parseError,
    saveMetrics: () => saveMutation.mutate(),
    isSaving: saveMutation.isPending,
    // New fields for dual-mode support
    isSkipped,
    coachingType
  }
}

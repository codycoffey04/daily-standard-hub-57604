import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { parseAgencyZoomCSV, type ParsedMetrics } from '@/utils/metricsParser'
import type { Database } from '@/integrations/supabase/types'

type EmailMetrics = Database['public']['Tables']['email_metrics']['Row']
type EmailMetricsInsert = Database['public']['Tables']['email_metrics']['Insert']

function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0]
}

export type PeriodType = 'weekly' | 'monthly'

interface TDSActivityMetrics {
  qhh: number
  quotes: number
  dials: number
  talk_minutes: number
}

export interface ProducerProductionMetrics {
  sales: number
  items: number
  premium: number
  policies: number
}

export function useEmailMetrics(periodStart: Date, periodType: PeriodType = 'weekly') {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [rawProductionPaste, setRawProductionPaste] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  const periodStartStr = formatDateForDB(periodStart)

  // Calculate period end based on type
  const periodEnd = useMemo(() => {
    const end = new Date(periodStart)
    if (periodType === 'weekly') {
      end.setDate(periodStart.getDate() + 6)
    } else {
      // Monthly: last day of month
      end.setMonth(periodStart.getMonth() + 1)
      end.setDate(0)
    }
    return end
  }, [periodStart, periodType])
  const periodEndStr = formatDateForDB(periodEnd)

  // Fetch existing metrics for this period
  const {
    data: metrics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['email-metrics', periodType, periodStartStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_metrics')
        .select('*')
        .eq('period_type', periodType)
        .eq('period_start', periodStartStr)
        .maybeSingle()

      if (error) throw error
      return data as EmailMetrics | null
    }
  })

  // Fetch TDS activity data for the period
  const { data: tdsActivity, isLoading: tdsLoading } = useQuery({
    queryKey: ['email-tds-activity', periodStartStr, periodEndStr],
    queryFn: async () => {
      // Get all producers
      const { data: producers } = await supabase
        .from('producers')
        .select('id, display_name')
        .eq('active', true)

      if (!producers || producers.length === 0) return null

      // Get daily entries for the period
      const { data: entries } = await supabase
        .from('daily_entries')
        .select('id, producer_id, outbound_dials, talk_minutes')
        .gte('entry_date', periodStartStr)
        .lte('entry_date', periodEndStr)

      if (!entries) return null

      // Get quoted households for these entries
      const entryIds = entries.map(e => e.id)
      const { data: households } = await supabase
        .from('quoted_households')
        .select('daily_entry_id, lead_id, lines_quoted')
        .in('daily_entry_id', entryIds.length > 0 ? entryIds : ['00000000-0000-0000-0000-000000000000'])

      // Aggregate by producer
      const producerMetrics: Record<string, TDSActivityMetrics> = {}
      const entryToProducer = new Map<string, string>()

      for (const entry of entries) {
        entryToProducer.set(entry.id, entry.producer_id)

        const producerName = producers.find(p => p.id === entry.producer_id)?.display_name?.toLowerCase() || entry.producer_id

        if (!producerMetrics[producerName]) {
          producerMetrics[producerName] = { qhh: 0, quotes: 0, dials: 0, talk_minutes: 0 }
        }
        producerMetrics[producerName].dials += entry.outbound_dials || 0
        producerMetrics[producerName].talk_minutes += entry.talk_minutes || 0
      }

      // Aggregate QHH and quotes from households
      if (households) {
        // Group by producer and count distinct leads
        const producerLeads: Record<string, Set<string>> = {}
        const producerQuotes: Record<string, number> = {}

        for (const hh of households) {
          const producerId = entryToProducer.get(hh.daily_entry_id)
          if (!producerId) continue

          const producerName = producers.find(p => p.id === producerId)?.display_name?.toLowerCase() || producerId

          if (!producerLeads[producerName]) {
            producerLeads[producerName] = new Set()
            producerQuotes[producerName] = 0
          }
          if (hh.lead_id) {
            producerLeads[producerName].add(hh.lead_id)
          }
          producerQuotes[producerName] += hh.lines_quoted || 0
        }

        for (const [name, leads] of Object.entries(producerLeads)) {
          if (producerMetrics[name]) {
            producerMetrics[name].qhh = leads.size
            producerMetrics[name].quotes = producerQuotes[name] || 0
          }
        }
      }

      return producerMetrics
    },
    enabled: !!periodStartStr && !!periodEndStr
  })

  // Parse raw paste on change
  const parsedProduction = useMemo<ParsedMetrics | null>(() => {
    if (!rawProductionPaste.trim()) {
      setParseError(null)
      return null
    }

    const result = parseAgencyZoomCSV(rawProductionPaste)
    if (!result.success) {
      setParseError(result.error || 'Failed to parse production metrics')
      return null
    }

    setParseError(null)
    return result.data || null
  }, [rawProductionPaste])

  // Reset raw paste when period changes and we have saved metrics
  useEffect(() => {
    if (metrics) {
      setRawProductionPaste('')
      setParseError(null)
    }
  }, [metrics])

  // Save/update mutation
  const saveMutation = useMutation({
    mutationFn: async (options?: { includeTDS?: boolean }) => {
      // Get production data from either parsed paste or existing metrics
      let producerMetrics: Record<string, ProducerProductionMetrics> = {}
      let teamSales = 0
      let teamItems = 0
      let teamPremium = 0
      let teamPolicies = 0

      if (parsedProduction) {
        // Use newly parsed data
        for (const [key, pm] of Object.entries(parsedProduction.producers)) {
          producerMetrics[key] = {
            sales: pm.sales,
            items: pm.items,
            premium: pm.premium,
            policies: pm.qhh // In AZ CSV, policies = qhh
          }
        }
        teamSales = parsedProduction.team.sales
        teamItems = parsedProduction.team.items
        teamPremium = parsedProduction.team.premium
        teamPolicies = parsedProduction.team.qhh
      } else if (metrics?.producer_metrics) {
        // Use existing data
        producerMetrics = metrics.producer_metrics as Record<string, ProducerProductionMetrics>
        teamSales = metrics.team_sales || 0
        teamItems = metrics.team_items || 0
        teamPremium = Number(metrics.team_premium) || 0
        teamPolicies = metrics.team_policies || 0
      }

      // Build TDS activity metrics
      let tdsActivityMetrics = metrics?.tds_activity_metrics || {}
      let teamQhh = metrics?.team_qhh || 0
      let teamQuotes = metrics?.team_quotes || 0

      if (options?.includeTDS && tdsActivity) {
        tdsActivityMetrics = tdsActivity
        teamQhh = 0
        teamQuotes = 0
        for (const activity of Object.values(tdsActivity)) {
          teamQhh += activity.qhh
          teamQuotes += activity.quotes
        }
      }

      const metricsData: EmailMetricsInsert = {
        period_type: periodType,
        period_start: periodStartStr,
        period_end: periodEndStr,
        raw_production_paste: rawProductionPaste || metrics?.raw_production_paste || null,
        producer_metrics: producerMetrics as unknown as Database['public']['Tables']['email_metrics']['Insert']['producer_metrics'],
        tds_activity_metrics: tdsActivityMetrics as unknown as Database['public']['Tables']['email_metrics']['Insert']['tds_activity_metrics'],
        team_sales: teamSales,
        team_items: teamItems,
        team_premium: teamPremium,
        team_policies: teamPolicies,
        team_qhh: teamQhh,
        team_quotes: teamQuotes,
        created_by: user?.id
      }

      if (metrics) {
        // Update existing
        const { error } = await supabase
          .from('email_metrics')
          .update(metricsData)
          .eq('id', metrics.id)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('email_metrics')
          .insert(metricsData)

        if (error) throw error
      }
    },
    onSuccess: () => {
      toast({
        title: 'Metrics saved',
        description: `${periodType === 'weekly' ? 'Weekly' : 'Monthly'} metrics for ${periodStartStr} saved successfully.`
      })
      setRawProductionPaste('')
      queryClient.invalidateQueries({ queryKey: ['email-metrics', periodType, periodStartStr] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error saving metrics',
        description: error.message,
        variant: 'destructive'
      })
    }
  })

  // Fetch previous period for WoW/MoM comparison
  const previousPeriodStart = useMemo(() => {
    const prev = new Date(periodStart)
    if (periodType === 'weekly') {
      prev.setDate(prev.getDate() - 7)
    } else {
      prev.setMonth(prev.getMonth() - 1)
    }
    return prev
  }, [periodStart, periodType])

  const { data: previousMetrics } = useQuery({
    queryKey: ['email-metrics', periodType, formatDateForDB(previousPeriodStart)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_metrics')
        .select('*')
        .eq('period_type', periodType)
        .eq('period_start', formatDateForDB(previousPeriodStart))
        .maybeSingle()

      if (error) throw error
      return data as EmailMetrics | null
    }
  })

  // Calculate deltas
  const deltas = useMemo(() => {
    if (!metrics || !previousMetrics) return null

    const calcDelta = (current: number, previous: number) => ({
      delta: current - previous,
      pct: previous > 0 ? ((current - previous) / previous) * 100 : 0
    })

    return {
      team_items: calcDelta(metrics.team_items || 0, previousMetrics.team_items || 0),
      team_premium: calcDelta(Number(metrics.team_premium) || 0, Number(previousMetrics.team_premium) || 0),
      team_sales: calcDelta(metrics.team_sales || 0, previousMetrics.team_sales || 0),
      team_qhh: calcDelta(metrics.team_qhh || 0, previousMetrics.team_qhh || 0)
    }
  }, [metrics, previousMetrics])

  return {
    metrics,
    isLoading,
    error,
    rawProductionPaste,
    setRawProductionPaste,
    parsedProduction,
    parseError,
    tdsActivity,
    tdsLoading,
    previousMetrics,
    deltas,
    saveMetrics: (options?: { includeTDS?: boolean }) => saveMutation.mutate(options),
    isSaving: saveMutation.isPending,
    refetch,
    periodStartStr,
    periodEndStr
  }
}

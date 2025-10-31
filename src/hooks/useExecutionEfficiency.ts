import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// Inline numeric coercion utility
function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

export interface ExecutionEfficiencyData {
  total_dials: number
  total_talk_minutes: number
  total_qhh: number
  total_shh: number
  total_policies: number
  total_premium: number
  premium_per_dial: number
  premium_per_hour: number
  commission_per_dial: number
  policies_per_shh: number
}

export function useExecutionEfficiency(
  fromDate: string,
  toDate: string,
  producerFilter: string | null = null,
  sourceFilter: string | null = null,
  commissionPct: number = 0.20
) {
  return useQuery({
    queryKey: ['execution-efficiency', fromDate, toDate, producerFilter, sourceFilter, commissionPct],
    queryFn: async (): Promise<ExecutionEfficiencyData | null> => {
      const { data, error } = await supabase.rpc('get_execution_efficiency_metrics' as any, {
        from_date: fromDate,
        to_date: toDate,
        producer_filter: producerFilter,
        source_filter: sourceFilter,
        commission_pct: commissionPct
      })

      if (error) throw error

      console.log('[get_execution_efficiency_metrics] raw:', data)

      // Unwrap array-of-one
      const row = Array.isArray(data) ? data[0] : data
      if (!row) return null

      const parsed = {
        total_dials: toNum(row.total_dials),
        total_talk_minutes: toNum(row.total_talk_minutes),
        total_qhh: toNum(row.total_qhh),
        total_shh: toNum(row.total_shh),
        total_policies: toNum(row.total_policies),
        total_premium: toNum(row.total_premium),
        premium_per_dial: toNum(row.premium_per_dial),
        premium_per_hour: toNum(row.premium_per_hour),
        commission_per_dial: toNum(row.commission_per_dial),
        policies_per_shh: toNum(row.policies_per_shh)
      }

      console.log('[useExecutionEfficiency] parsed:', parsed)

      return parsed
    },
    enabled: !!fromDate && !!toDate
  })
}

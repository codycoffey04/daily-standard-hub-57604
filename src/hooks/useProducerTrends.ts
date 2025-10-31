import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// Inline numeric coercion utility
function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

// ACTUAL RPC RETURN: Aggregated totals per producer (NOT daily rows)
export interface ProducerTrendData {
  producer_id: string
  producer_name: string
  qhh: number
  policies_sold: number
  items_sold: number
}

export function useProducerTrends(
  producerIds: string[] | null,
  fromDate: string,
  toDate: string
) {
  return useQuery({
    queryKey: ['producer-trends', producerIds, fromDate, toDate],
    queryFn: async (): Promise<ProducerTrendData[]> => {
      const { data, error } = await supabase.rpc('get_producer_trends' as any, {
        producer_ids: producerIds,
        from_date: fromDate,
        to_date: toDate
      })

      if (error) throw error
      
      console.log('[get_producer_trends] raw:', data)
      
      // Map and coerce numeric fields
      const parsed = (data || []).map((row: any) => ({
        producer_id: row.producer_id,
        producer_name: row.producer_name,
        qhh: toNum(row.qhh),
        policies_sold: toNum(row.policies_sold),
        items_sold: toNum(row.items_sold)
      }))
      
      console.log('[useProducerTrends] parsed:', parsed)
      
      return parsed
    },
    enabled: !!fromDate && !!toDate
  })
}

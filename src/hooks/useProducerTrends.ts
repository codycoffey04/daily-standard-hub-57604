import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// Inline numeric coercion utility
function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

// ACTUAL RPC RETURN: Daily rows per producer with date, dials, talk time, etc.
export interface ProducerTrendData {
  entry_date: string
  producer_id: string
  producer_name: string
  outbound_dials: number
  talk_minutes: number
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
      
      // Map RPC results - sold_households now includes both QH and SFOQ
      const parsed = (data || []).map((row: any) => ({
        entry_date: row.entry_date ? String(row.entry_date) : '',
        producer_id: row.producer_id,
        producer_name: row.producer_name,
        outbound_dials: toNum(row.outbound_dials),
        talk_minutes: toNum(row.talk_minutes),
        qhh: toNum(row.qhh),
        policies_sold: toNum(row.sold_households),  // Now includes QH + SFOQ
        items_sold: toNum(row.sold_items)
      }))
      
      return parsed
    },
    enabled: !!fromDate && !!toDate
  })
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface ProducerTrendData {
  entry_date: string
  producer_id: string
  producer_name: string
  outbound_dials: number
  talk_minutes: number
  qhh: number
  items: number
  quotes: number
  sold_items: number
  sold_premium: number
  framework_status: 'Top' | 'Bottom' | 'Outside'
  days_top: number
  days_bottom: number
  days_outside: number
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
      return (data || []) as ProducerTrendData[]
    },
    enabled: !!fromDate && !!toDate
  })
}

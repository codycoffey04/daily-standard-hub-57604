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
  year: number,
  month: number | null
) {
  return useQuery({
    queryKey: ['producer-trends', producerIds, year, month],
    queryFn: async (): Promise<ProducerTrendData[]> => {
      const startDate = month
        ? `${year}-${String(month).padStart(2, '0')}-01`
        : `${year}-01-01`
      
      const endDate = month
        ? new Date(year, month, 0).toISOString().split('T')[0]
        : `${year}-12-31`

      const { data, error } = await supabase.rpc('get_producer_trends' as any, {
        producer_ids: producerIds,
        from_date: startDate,
        to_date: endDate
      })

      if (error) throw error
      return (data || []) as ProducerTrendData[]
    },
    enabled: true
  })
}

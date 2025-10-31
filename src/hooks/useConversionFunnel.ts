import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface ConversionFunnelStage {
  stage_number: number
  stage_name: string
  stage_value: number
  conversion_rate: number
  drop_off_count: number
  drop_off_rate: number
}

export const useConversionFunnel = (
  year: number,
  month: number | null,
  producerId: string | null = null,
  sourceId: string | null = null
) => {
  return useQuery({
    queryKey: ['conversion-funnel', year, month, producerId, sourceId],
    queryFn: async (): Promise<ConversionFunnelStage[]> => {
      let fromDate: string
      let toDate: string

      if (month !== null) {
        // Specific month
        fromDate = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      } else {
        // Full year
        fromDate = `${year}-01-01`
        toDate = `${year}-12-31`
      }

      console.log('📊 Fetching conversion funnel:', { fromDate, toDate, producerId, sourceId })

      const { data, error } = await supabase.rpc('get_conversion_funnel' as any, {
        from_date: fromDate,
        to_date: toDate,
        producer_filter: producerId,
        source_filter: sourceId
      })

      if (error) {
        console.error('❌ Error fetching conversion funnel:', error)
        throw error
      }

      console.log('✅ Conversion funnel data:', data)
      return (data as unknown as ConversionFunnelStage[]) || []
    }
  })
}

export const useProducers = () => {
  return useQuery({
    queryKey: ['producers-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producers')
        .select('id, display_name')
        .eq('active', true)
        .order('display_name')

      if (error) throw error
      return data || []
    }
  })
}

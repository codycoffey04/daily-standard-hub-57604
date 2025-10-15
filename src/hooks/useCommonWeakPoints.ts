import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface WeakPoint {
  gap_name: string
  frequency: number
  affected_producers: number
  recent_count: number
  producer_names: string
}

export const useCommonWeakPoints = (
  year: number,
  month: number | null = null,
  producerId: string | null = null
) => {
  return useQuery({
    queryKey: ['common-weak-points', year, month, producerId],
    queryFn: async (): Promise<WeakPoint[]> => {
      // Calculate date range
      const startDate = month !== null
        ? new Date(year, month - 1, 1).toISOString().split('T')[0]
        : `${year}-01-01`
      
      const endDate = month !== null
        ? new Date(year, month, 0).toISOString().split('T')[0]
        : `${year}-12-31`

      const { data, error } = await supabase.rpc('get_common_weak_points' as any, {
        from_date: startDate,
        to_date: endDate,
        producer_filter: producerId
      })

      if (error) throw error
      return (data as WeakPoint[]) || []
    }
  })
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface ReviewSummaryData {
  id: string
  created_at: string
  entry_date: string
  producer_name: string
  reviewer_name: string
  metrics_achieved: boolean | null
  weak_steps: string[]
  expansion_topics: string[]
  activity_comments: string | null
  qhh_total: number
  items_total: number
  sales_total: number
}

export function useReviewSummary(
  year: number,
  month: number | null
) {
  return useQuery({
    queryKey: ['review-summary', year, month],
    queryFn: async (): Promise<ReviewSummaryData[]> => {
      const startDate = month
        ? `${year}-${String(month).padStart(2, '0')}-01`
        : `${year}-01-01`
      
      const endDate = month
        ? new Date(year, month, 0).toISOString().split('T')[0]
        : `${year}-12-31`

      // Fetch accountability reviews with related data
      const { data: reviews, error } = await supabase
        .from('accountability_reviews')
        .select(`
          id,
          created_at,
          metrics_achieved,
          weak_steps,
          expansion_topics,
          activity_comments,
          reviewer_id,
          daily_entries!inner (
            id,
            entry_date,
            qhh_total,
            items_total,
            sales_total,
            producers!inner (
              id,
              display_name
            )
          )
        `)
        .gte('daily_entries.entry_date', startDate)
        .lte('daily_entries.entry_date', endDate)
        .order('daily_entries(entry_date)', { ascending: false })

      if (error) throw error

      // Get unique reviewer IDs
      const reviewerIds = [...new Set(reviews?.map(r => r.reviewer_id) || [])]
      
      // Fetch reviewer profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', reviewerIds)

      if (profilesError) throw profilesError

      // Create a map for quick lookup
      const profilesMap = new Map(
        profiles?.map(p => [p.id, p.display_name]) || []
      )

      // Transform the data
      const transformed: ReviewSummaryData[] = (reviews || []).map(review => {
        const dailyEntry = Array.isArray(review.daily_entries) 
          ? review.daily_entries[0] 
          : review.daily_entries
        
        const producer = Array.isArray(dailyEntry.producers)
          ? dailyEntry.producers[0]
          : dailyEntry.producers

        return {
          id: review.id,
          created_at: review.created_at,
          entry_date: dailyEntry.entry_date,
          producer_name: producer.display_name,
          reviewer_name: profilesMap.get(review.reviewer_id) || 'Unknown',
          metrics_achieved: review.metrics_achieved,
          weak_steps: Array.isArray(review.weak_steps) ? review.weak_steps : [],
          expansion_topics: Array.isArray(review.expansion_topics) ? review.expansion_topics : [],
          activity_comments: review.activity_comments,
          qhh_total: dailyEntry.qhh_total || 0,
          items_total: dailyEntry.items_total || 0,
          sales_total: dailyEntry.sales_total || 0
        }
      })

      return transformed
    },
    enabled: true
  })
}

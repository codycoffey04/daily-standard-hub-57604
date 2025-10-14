import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface ReviewSummaryData {
  id: string
  created_at: string
  review_date: string
  producer_name: string
  reviewer_name: string
  call_reviewed: string | null
  sales_process_gaps: string[]
  coaching_notes: string | null
  strengths_noted: string | null
  action_items: string | null
  follow_up_required: boolean | null
  follow_up_date: string | null
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

      // Fetch manager reviews with related data
      const { data: reviews, error } = await supabase
        .from('manager_reviews' as any)
        .select(`
          id,
          created_at,
          review_date,
          call_reviewed,
          sales_process_gaps,
          coaching_notes,
          strengths_noted,
          action_items,
          follow_up_required,
          follow_up_date,
          reviewer_id,
          producers!inner (
            id,
            display_name
          )
        `)
        .gte('review_date', startDate)
        .lte('review_date', endDate)
        .order('review_date', { ascending: false }) as any

      if (error) throw error

      // Get unique reviewer IDs
      const reviewerIds = [...new Set((reviews || []).map((r: any) => r.reviewer_id).filter((id): id is string => !!id))] as string[]
      
      // Fetch reviewer profiles
      const { data: profiles, error: profilesError } = await (supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', reviewerIds) as any)

      if (profilesError) throw profilesError

      // Create a map for quick lookup
      const profilesMap = new Map(
        profiles?.map(p => [p.id, p.display_name]) || []
      )

      // Transform the data
      const transformed: ReviewSummaryData[] = (reviews || []).map(review => {
        const producer = Array.isArray(review.producers)
          ? review.producers[0]
          : review.producers

        return {
          id: review.id,
          created_at: review.created_at,
          review_date: review.review_date,
          producer_name: producer.display_name,
          reviewer_name: profilesMap.get(review.reviewer_id) || 'Unknown',
          call_reviewed: review.call_reviewed,
          sales_process_gaps: Array.isArray(review.sales_process_gaps) ? review.sales_process_gaps : [],
          coaching_notes: review.coaching_notes,
          strengths_noted: review.strengths_noted,
          action_items: review.action_items,
          follow_up_required: review.follow_up_required,
          follow_up_date: review.follow_up_date
        }
      })

      return transformed
    },
    enabled: true
  })
}

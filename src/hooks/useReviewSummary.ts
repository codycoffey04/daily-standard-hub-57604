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

      // Query 1: Fetch manager reviews without joins
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
          producer_id
        `)
        .gte('review_date', startDate)
        .lte('review_date', endDate)
        .order('review_date', { ascending: false })

      if (error) throw error

      // Extract unique IDs
      const producerIds = [...new Set((reviews || []).map((r: any) => r.producer_id).filter((id): id is string => !!id))]
      const reviewerIds = [...new Set((reviews || []).map((r: any) => r.reviewer_id).filter((id): id is string => !!id))]
      
      // Query 2: Fetch producer profiles (by producer_id)
      const { data: producerProfiles, error: producerError } = await supabase
        .from('profiles')
        .select('producer_id, display_name')
        .in('producer_id', producerIds)

      if (producerError) throw producerError

      // Query 3: Fetch reviewer profiles (by id)
      const { data: reviewerProfiles, error: reviewerError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', reviewerIds)

      if (reviewerError) throw reviewerError

      // Create lookup maps
      const producerMap = new Map(
        producerProfiles?.map(p => [p.producer_id, p.display_name]) || []
      )
      const reviewerMap = new Map(
        reviewerProfiles?.map(p => [p.id, p.display_name]) || []
      )

      // Transform and merge the data
      const transformed: ReviewSummaryData[] = (reviews || []).map((review: any) => ({
        id: review.id,
        created_at: review.created_at,
        review_date: review.review_date,
        producer_name: producerMap.get(review.producer_id) || 'Unknown Producer',
        reviewer_name: reviewerMap.get(review.reviewer_id) || 'Unknown Reviewer',
        call_reviewed: review.call_reviewed,
        sales_process_gaps: Array.isArray(review.sales_process_gaps) ? review.sales_process_gaps : [],
        coaching_notes: review.coaching_notes,
        strengths_noted: review.strengths_noted,
        action_items: review.action_items,
        follow_up_required: review.follow_up_required,
        follow_up_date: review.follow_up_date
      }))

      return transformed
    },
    enabled: true
  })
}

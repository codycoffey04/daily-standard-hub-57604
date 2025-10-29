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

      // Query 1: Fetch accountability reviews with joins to daily_entries and producers
      const { data: reviews, error } = await supabase
        .from('accountability_reviews')
        .select(`
          id,
          created_at,
          reviewer_id,
          call_recording_reviewed,
          weak_steps,
          activity_comments,
          activities_achieved,
          expansion_topics,
          quick_meeting_notes,
          daily_entries!inner(
            entry_date,
            producers!inner(
              display_name
            )
          )
        `)
        .gte('daily_entries.entry_date', startDate)
        .lte('daily_entries.entry_date', endDate)

      if (error) throw error

      // Extract unique reviewer IDs
      const reviewerIds = [...new Set((reviews || [])
        .map((r: any) => r.reviewer_id)
        .filter((id): id is string => !!id)
      )]
      
      // Query 2: Fetch reviewer profiles
      const { data: reviewerProfiles, error: reviewerError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', reviewerIds)

      if (reviewerError) throw reviewerError

      // Create reviewer lookup map
      const reviewerMap = new Map(
        reviewerProfiles?.map(p => [p.id, p.display_name]) || []
      )

      // Transform and merge the data
      const transformed: ReviewSummaryData[] = (reviews || []).map((review: any) => ({
        id: review.id,
        created_at: review.created_at,
        review_date: review.daily_entries.entry_date,
        producer_name: review.daily_entries.producers.display_name,
        reviewer_name: reviewerMap.get(review.reviewer_id) || 'Unknown Reviewer',
        call_reviewed: review.call_recording_reviewed,
        sales_process_gaps: Array.isArray(review.weak_steps) ? review.weak_steps : [],
        coaching_notes: review.activity_comments || review.quick_meeting_notes || null,
        strengths_noted: Array.isArray(review.activities_achieved) 
          ? review.activities_achieved.join(', ') 
          : null,
        action_items: review.expansion_topics,
        follow_up_required: review.expansion_topics ? true : null,
        follow_up_date: null
      }))

      // Sort by review_date (entry_date) in descending order (newest first)
      return transformed.sort((a, b) => 
        new Date(b.review_date).getTime() - new Date(a.review_date).getTime()
      )
    },
    enabled: true
  })
}

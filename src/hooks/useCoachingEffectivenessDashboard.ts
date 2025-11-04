import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// Interfaces for the dashboard data
export interface OverallMetrics {
  total_reviews: number
  total_producers: number
  avg_days_between_reviews: number
  overall_resolution_rate: number
  trend_direction: 'improving' | 'declining' | 'stable'
  effectiveness_score: number
}

export interface ProducerProgress {
  producer_id: string
  producer_name: string
  total_reviews: number
  resolved_issues: number
  unresolved_issues: number
  resolution_rate: number
  avg_days_between_reviews: number
  last_review_date: string
  trend: 'improving' | 'declining' | 'stable'
}

export interface GapAnalysis {
  gap_category: string
  frequency: number
  resolution_rate: number
  avg_resolution_days: number
  severity: 'high' | 'medium' | 'low'
}

export interface WeeklyTrend {
  week_start: string
  reviews_count: number
  resolution_rate: number
  avg_effectiveness_score: number
}

export interface CoachingEffectivenessDashboard {
  overall_metrics: OverallMetrics | null
  producer_progress: ProducerProgress[]
  gap_analysis: GapAnalysis[]
  weekly_trends: WeeklyTrend[]
}

export const useCoachingEffectivenessDashboard = (timeframe: number = 30) => {
  return useQuery({
    queryKey: ['coaching-effectiveness-dashboard', timeframe],
    queryFn: async (): Promise<CoachingEffectivenessDashboard> => {
      // Call all 4 functions in parallel with correct function names
      const [metricsRes, progressRes, gapRes, trendRes] = await Promise.all([
        // @ts-expect-error - Function exists in database but not in auto-generated types
        supabase.rpc('get_coaching_effectiveness_metrics', {
          p_days_back: timeframe
        }),
        // @ts-expect-error - Function exists in database but not in auto-generated types
        supabase.rpc('get_producer_progress', {
          p_days_back: timeframe
        }),
        // @ts-expect-error - Function exists in database but not in auto-generated types
        supabase.rpc('get_gap_analysis', {
          p_days_back: timeframe
        }),
        // @ts-expect-error - Function exists in database but not in auto-generated types
        supabase.rpc('get_weekly_coaching_trend', {
          p_weeks_back: 4
        })
      ])

      // Handle errors
      if (metricsRes.error) throw metricsRes.error
      if (progressRes.error) throw progressRes.error
      if (gapRes.error) throw gapRes.error
      if (trendRes.error) throw trendRes.error

      return {
        overall_metrics: (metricsRes.data as unknown as OverallMetrics) || null,
        producer_progress: (progressRes.data as unknown as ProducerProgress[]) || [],
        gap_analysis: (gapRes.data as unknown as GapAnalysis[]) || [],
        weekly_trends: (trendRes.data as unknown as WeeklyTrend[]) || []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  })
}

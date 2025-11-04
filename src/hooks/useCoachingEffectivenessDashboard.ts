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
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - timeframe)

      // Call all 4 functions in parallel
      // @ts-ignore - Functions exist in DB but types not yet regenerated
      const [overallRes, producerRes, gapRes, trendRes] = await Promise.all([
        // @ts-ignore
        supabase.rpc('get_coaching_effectiveness_overall', {
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0]
        }),
        // @ts-ignore
        supabase.rpc('get_coaching_effectiveness_by_producer', {
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0]
        }),
        // @ts-ignore
        supabase.rpc('get_coaching_gap_analysis', {
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0]
        }),
        // @ts-ignore
        supabase.rpc('get_coaching_weekly_trends', {
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0]
        })
      ])

      // Handle errors
      if (overallRes.error) throw overallRes.error
      if (producerRes.error) throw producerRes.error
      if (gapRes.error) throw gapRes.error
      if (trendRes.error) throw trendRes.error

      return {
        overall_metrics: (overallRes.data?.[0] as unknown as OverallMetrics) || null,
        producer_progress: (producerRes.data as unknown as ProducerProgress[]) || [],
        gap_analysis: (gapRes.data as unknown as GapAnalysis[]) || [],
        weekly_trends: (trendRes.data as unknown as WeeklyTrend[]) || []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

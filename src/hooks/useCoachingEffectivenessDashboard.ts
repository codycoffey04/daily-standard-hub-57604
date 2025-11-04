import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// Interfaces matching what component expects
export interface OverallMetrics {
  overall_score: number
  effectiveness_score: number // Component uses this
  issue_resolution_rate: number
  overall_resolution_rate: number // Component uses this
  total_issues: number
  resolved: number
  metrics_achieved_count: number
  avg_time_to_improvement: number
  avg_days_between_reviews: number // Component uses this
  producers_coached: number
  total_producers: number // Component uses this
  total_sessions: number
  total_reviews: number // Component uses this
  trend_direction: 'improving' | 'declining' | 'stable' // Component uses this
}

export interface ProducerProgress {
  name: string
  producer_name: string // Component uses this
  producer_id: string
  baseline: {
    dials: number
    talk_time: number
    quoted_hh: number
    items_sold: number
  }
  current: {
    dials: number
    talk_time: number
    quoted_hh: number
    items_sold: number
  }
  coaching_sessions: number
  gaps_addressed: number
  gaps_identified: number
  improvement_rate: number
  status: 'excellent' | 'improving' | 'steady'
  last_coached: string | null
  // Additional fields component expects
  total_reviews: number
  resolved_issues: number
  unresolved_issues: number
  resolution_rate: number
  avg_days_between_reviews: number
  trend: 'improving' | 'declining' | 'stable'
  last_review_date: string | null
}

export interface GapAnalysis {
  category: string
  gap_category: string // Component uses this
  frequency: number
  severity: 'high' | 'medium' | 'low'
  avg_resolution_days: number
  success_rate: number
  resolution_rate: number // Component uses this
  affected_producers: string[]
  affected_producers_count: number
}

export interface WeeklyTrend {
  week: string
  identified: number
  resolved: number
  effectiveness: number
  week_start: string // Component uses this
  resolution_rate: number // Component uses this
  avg_effectiveness_score: number // Component uses this
  reviews_count: number // Component uses this
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
      // Call the actual functions that exist in the database
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
      if (metricsRes.error) {
        console.error('get_coaching_effectiveness_metrics error:', metricsRes.error)
        throw metricsRes.error
      }
      if (progressRes.error) {
        console.error('get_producer_progress error:', progressRes.error)
        throw progressRes.error
      }
      if (gapRes.error) {
        console.error('get_gap_analysis error:', gapRes.error)
        throw gapRes.error
      }
      if (trendRes.error) {
        console.error('get_weekly_coaching_trend error:', trendRes.error)
        throw trendRes.error
      }

      // Unwrap the RPC responses (data is returned directly, not wrapped)
      const metricsRaw = metricsRes.data as any
      const progressRaw = (progressRes.data || []) as any[]
      const gapsRaw = (gapRes.data || []) as any[]
      const trendsRaw = (trendRes.data || []) as any[]

      // Transform metrics to match component expectations
      const transformedMetrics: OverallMetrics = metricsRaw ? {
        overall_score: metricsRaw.overall_score || 0,
        effectiveness_score: metricsRaw.overall_score || 0, // Map to component field
        issue_resolution_rate: metricsRaw.issue_resolution_rate || 0,
        overall_resolution_rate: metricsRaw.issue_resolution_rate || 0, // Map to component field
        total_issues: metricsRaw.total_issues || 0,
        resolved: metricsRaw.resolved || 0,
        metrics_achieved_count: metricsRaw.metrics_achieved_count || 0,
        avg_time_to_improvement: metricsRaw.avg_time_to_improvement || 0,
        avg_days_between_reviews: 7, // Default, not calculated in DB
        producers_coached: metricsRaw.producers_coached || 0,
        total_producers: metricsRaw.producers_coached || 0, // Map to component field
        total_sessions: metricsRaw.total_sessions || 0,
        total_reviews: metricsRaw.total_sessions || 0, // Map to component field
        trend_direction: metricsRaw.overall_score >= 70 ? 'improving' as const
          : metricsRaw.overall_score >= 50 ? 'stable' as const
          : 'declining' as const
      } : null

      // Transform producer progress
      const transformedProgress: ProducerProgress[] = progressRaw.map(p => ({
        name: p.name,
        producer_name: p.name, // Component uses this
        producer_id: p.producer_id,
        baseline: p.baseline,
        current: p.current,
        coaching_sessions: p.coaching_sessions || 0,
        gaps_addressed: p.gaps_addressed || 0,
        gaps_identified: p.gaps_identified || 0,
        improvement_rate: p.improvement_rate || 0,
        status: p.status,
        last_coached: p.last_coached,
        total_reviews: p.coaching_sessions || 0,
        resolved_issues: p.gaps_addressed || 0,
        unresolved_issues: Math.max(0, (p.gaps_identified || 0) - (p.gaps_addressed || 0)),
        resolution_rate: (p.gaps_identified || 0) > 0 
          ? Math.round(((p.gaps_addressed || 0) / (p.gaps_identified || 0)) * 100)
          : 0,
        avg_days_between_reviews: 7, // Default, not calculated
        trend: p.status === 'excellent' ? 'improving' as const
          : p.status === 'improving' ? 'improving' as const
          : 'stable' as const,
        last_review_date: p.last_coached
      }))

      // Transform gap analysis
      const transformedGaps: GapAnalysis[] = gapsRaw.map(g => ({
        category: g.category,
        gap_category: g.category, // Component uses both
        frequency: g.frequency || 0,
        severity: g.severity || 'low',
        avg_resolution_days: g.avg_resolution_days || 0,
        success_rate: g.success_rate || 0,
        resolution_rate: g.success_rate || 0, // Map to component field
        affected_producers: g.affected_producers || [],
        affected_producers_count: g.affected_producers_count || 0
      }))

      // Transform weekly trends
      const transformedTrends: WeeklyTrend[] = trendsRaw.map(t => ({
        week: t.week || '',
        identified: t.identified || 0,
        resolved: t.resolved || 0,
        effectiveness: t.effectiveness || 0,
        week_start: '', // Not in DB response
        resolution_rate: t.effectiveness || 0, // Map effectiveness to resolution_rate
        avg_effectiveness_score: t.effectiveness || 0, // Map effectiveness
        reviews_count: t.identified || 0 // Use identified as reviews count
      }))

      return {
        overall_metrics: transformedMetrics,
        producer_progress: transformedProgress,
        gap_analysis: transformedGaps,
        weekly_trends: transformedTrends
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  })
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { format } from 'date-fns'

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

// Helper function to safely parse week_start from various possible formats
const parseWeekStart = (weekString: string, weekStartField?: any): string => {
  // Try to use the week_start field from DB response first
  if (weekStartField && typeof weekStartField === 'string' && weekStartField.trim() !== '') {
    return weekStartField
  }
  
  // Fall back to parsing from the week field
  if (!weekString || weekString.trim() === '') {
    return ''
  }
  
  // Try to parse ISO date format (2024-01-15)
  if (/^\d{4}-\d{2}-\d{2}$/.test(weekString)) {
    return weekString
  }
  
  // Try to parse "2024-W01" format (ISO week format)
  const weekMatch = weekString.match(/^(\d{4})-W(\d{2})$/)
  if (weekMatch) {
    const [, year, week] = weekMatch
    // Convert to approximate date (Monday of that week)
    const date = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7)
    return date.toISOString().split('T')[0]
  }
  
  // Try to parse "2024-01" format (year-month)
  const monthMatch = weekString.match(/^(\d{4})-(\d{2})$/)
  if (monthMatch) {
    const [, year, month] = monthMatch
    return `${year}-${month}-01`
  }
  
  // If no pattern matches, return empty string
  return ''
}

export const useCoachingEffectivenessDashboard = (
  startDate?: string, 
  endDate?: string, 
  timeframe?: number
) => {
  // If date range is provided, use it; otherwise fall back to timeframe (days back from today)
  const queryKey = startDate && endDate 
    ? ['coaching-effectiveness-dashboard', startDate, endDate]
    : ['coaching-effectiveness-dashboard', timeframe || 30]
  
  return useQuery({
    queryKey,
    queryFn: async (): Promise<CoachingEffectivenessDashboard> => {
      let metricsRes: any, progressRes: any, gapRes: any, trendRes: any
      
      // Calculate days_back from date range if provided
      // Note: This uses days_back functions which get data from (today - days_back) to today
      // For specific months, we calculate days from today to start date
      let daysBack = timeframe || 30
      if (startDate && endDate) {
        const start = new Date(startDate)
        const today = new Date()
        const daysDiff = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        // Use the larger of: days to start date, or days in the range
        const rangeDays = Math.ceil((new Date(endDate).getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        daysBack = Math.max(daysDiff, rangeDays)
      }
      
      // Use days_back functions (date-range functions not yet applied to database)
      const results = await Promise.all([
        // @ts-expect-error - Function exists in database but not in auto-generated types
        supabase.rpc('get_coaching_effectiveness_metrics', {
          p_days_back: daysBack
        }),
        // @ts-expect-error - Function exists in database but not in auto-generated types
        supabase.rpc('get_producer_progress', {
          p_days_back: daysBack
        }),
        // @ts-expect-error - Function exists in database but not in auto-generated types
        supabase.rpc('get_gap_analysis', {
          p_days_back: daysBack
        }),
        // @ts-expect-error - Function exists in database but not in auto-generated types
        supabase.rpc('get_weekly_coaching_trend', {
          p_weeks_back: Math.ceil(daysBack / 7)
        })
      ])
      metricsRes = results[0]
      progressRes = results[1]
      gapRes = results[2]
      trendRes = results[3]
      
      // Note: We're using p_days_back functions which get data from (today - days_back) to today
      // This is a workaround until date-range functions are applied to the database
      // The days_back is calculated from the start date to ensure we include the selected month's data

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

      // Transform metrics to match component expectations (always using days_back response structure)
      const resolutionRate = metricsRaw?.issue_resolution_rate || 0
      const totalProducers = metricsRaw?.producers_coached || 0
      const totalReviews = metricsRaw?.total_sessions || 0
      const avgDaysBetween = 7 // Default value
      
      // Calculate effectiveness_score as a composite metric
      // Based on radar chart: Resolution Rate (40%), Consistency (30%), Coverage (30%)
      const consistencyScore = avgDaysBetween > 0 
        ? Math.min(100, (7 / avgDaysBetween) * 100)
        : 0
      const coverageScore = totalProducers > 0
        ? Math.min(100, (totalReviews / totalProducers) * 10)
        : 0
      
      // Weighted composite score
      const effectivenessScore = Math.round(
        (resolutionRate * 0.4) + 
        (consistencyScore * 0.3) + 
        (coverageScore * 0.3)
      )
      
      const transformedMetrics: OverallMetrics | null = metricsRaw ? {
        overall_score: effectivenessScore,
        effectiveness_score: effectivenessScore,
        issue_resolution_rate: resolutionRate,
        overall_resolution_rate: resolutionRate,
        total_issues: metricsRaw.total_issues || 0,
        resolved: metricsRaw.resolved || 0,
        metrics_achieved_count: metricsRaw.metrics_achieved_count || 0,
        avg_time_to_improvement: metricsRaw.avg_time_to_improvement || 0,
        avg_days_between_reviews: avgDaysBetween,
        producers_coached: totalProducers,
        total_producers: totalProducers,
        total_sessions: totalReviews,
        total_reviews: totalReviews,
        trend_direction: effectivenessScore >= 70 ? 'improving' as const
          : effectivenessScore >= 50 ? 'stable' as const
          : 'declining' as const
      } : null

      // Transform producer progress (always using days_back response structure)
      const transformedProgress: ProducerProgress[] = progressRaw.map(p => ({
        name: p.name,
        producer_name: p.name,
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
        avg_days_between_reviews: 7,
        trend: p.status === 'excellent' ? 'improving' as const
          : p.status === 'improving' ? 'improving' as const
          : 'stable' as const,
        last_review_date: p.last_coached
      }))

      // Transform gap analysis (always using days_back response structure)
      const transformedGaps: GapAnalysis[] = gapsRaw.map(g => ({
        category: g.category,
        gap_category: g.category,
        frequency: g.frequency || 0,
        severity: g.severity || 'low',
        avg_resolution_days: g.avg_resolution_days || 0,
        success_rate: g.success_rate || 0,
        resolution_rate: g.success_rate || 0,
        affected_producers: g.affected_producers || [],
        affected_producers_count: g.affected_producers_count || 0
      }))

      // Transform weekly trends (always using days_back response structure)
      const transformedTrends: WeeklyTrend[] = trendsRaw
        .map(t => {
          const weekStart = parseWeekStart(t.week || '', t.week_start || t.week_start_date || t.start_date)
          return {
            week: t.week || '',
            identified: t.identified || 0,
            resolved: t.resolved || 0,
            effectiveness: t.effectiveness || 0,
            week_start: weekStart,
            resolution_rate: t.effectiveness || 0,
            avg_effectiveness_score: t.effectiveness || 0,
            reviews_count: t.identified || 0
          }
        })
        .filter(t => t.week_start !== '') // Filter out entries with invalid dates

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

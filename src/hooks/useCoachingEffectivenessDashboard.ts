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
      let metricsRes, progressRes, gapRes, trendRes
      
      if (startDate && endDate) {
        // Use date-range functions from migrations
        [metricsRes, progressRes, gapRes, trendRes] = await Promise.all([
          // @ts-expect-error - Function exists in database but not in auto-generated types
          supabase.rpc('get_coaching_effectiveness_overall', {
            p_start_date: startDate,
            p_end_date: endDate
          }),
          // @ts-expect-error - Function exists in database but not in auto-generated types
          supabase.rpc('get_coaching_effectiveness_by_producer', {
            p_start_date: startDate,
            p_end_date: endDate
          }),
          // @ts-expect-error - Function exists in database but not in auto-generated types
          supabase.rpc('get_coaching_gap_analysis', {
            p_start_date: startDate,
            p_end_date: endDate
          }),
          // @ts-expect-error - Function exists in database but not in auto-generated types
          supabase.rpc('get_coaching_weekly_trends', {
            p_start_date: startDate,
            p_end_date: endDate
          })
        ])
      } else {
        // Fallback to days_back functions (for backward compatibility)
        const daysBack = timeframe || 30
        [metricsRes, progressRes, gapRes, trendRes] = await Promise.all([
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
            p_weeks_back: 4
          })
        ])
      }

      // Handle errors
      if (metricsRes.error) {
        console.error(startDate && endDate 
          ? 'get_coaching_effectiveness_overall error:' 
          : 'get_coaching_effectiveness_metrics error:', metricsRes.error)
        throw metricsRes.error
      }
      if (progressRes.error) {
        console.error(startDate && endDate 
          ? 'get_coaching_effectiveness_by_producer error:' 
          : 'get_producer_progress error:', progressRes.error)
        throw progressRes.error
      }
      if (gapRes.error) {
        console.error(startDate && endDate 
          ? 'get_coaching_gap_analysis error:' 
          : 'get_gap_analysis error:', gapRes.error)
        throw gapRes.error
      }
      if (trendRes.error) {
        console.error(startDate && endDate 
          ? 'get_coaching_weekly_trends error:' 
          : 'get_weekly_coaching_trend error:', trendRes.error)
        throw trendRes.error
      }

      // Unwrap the RPC responses (data is returned directly, not wrapped)
      const metricsRaw = metricsRes.data as any
      const progressRaw = (progressRes.data || []) as any[]
      const gapsRaw = (gapRes.data || []) as any[]
      const trendsRaw = (trendRes.data || []) as any[]

      // Transform metrics to match component expectations
      let transformedMetrics: OverallMetrics | null = null
      
      if (startDate && endDate) {
        // Using date-range functions - different response structure
        const metricsRow = Array.isArray(metricsRaw) ? metricsRaw[0] : metricsRaw
        transformedMetrics = metricsRow ? {
          overall_score: metricsRow.resolution_rate || 0,
          effectiveness_score: metricsRow.resolution_rate || 0,
          issue_resolution_rate: metricsRow.resolution_rate || 0,
          overall_resolution_rate: metricsRow.resolution_rate || 0,
          total_issues: (metricsRow.avg_gaps_per_review || 0) * (metricsRow.total_reviews || 0),
          resolved: Math.round((metricsRow.resolution_rate || 0) / 100 * (metricsRow.total_reviews || 0)),
          metrics_achieved_count: 0,
          avg_time_to_improvement: metricsRow.avg_days_to_resolve || 0,
          avg_days_between_reviews: 7,
          producers_coached: 0,
          total_producers: 0,
          total_sessions: metricsRow.total_reviews || 0,
          total_reviews: metricsRow.total_reviews || 0,
          trend_direction: metricsRow.resolution_rate >= 70 ? 'improving' as const
            : metricsRow.resolution_rate >= 50 ? 'stable' as const
            : 'declining' as const
        } : null
      } else {
        // Using days_back functions - original response structure
        transformedMetrics = metricsRaw ? {
          overall_score: metricsRaw.overall_score || 0,
          effectiveness_score: metricsRaw.overall_score || 0,
          issue_resolution_rate: metricsRaw.issue_resolution_rate || 0,
          overall_resolution_rate: metricsRaw.issue_resolution_rate || 0,
          total_issues: metricsRaw.total_issues || 0,
          resolved: metricsRaw.resolved || 0,
          metrics_achieved_count: metricsRaw.metrics_achieved_count || 0,
          avg_time_to_improvement: metricsRaw.avg_time_to_improvement || 0,
          avg_days_between_reviews: 7,
          producers_coached: metricsRaw.producers_coached || 0,
          total_producers: metricsRaw.producers_coached || 0,
          total_sessions: metricsRaw.total_sessions || 0,
          total_reviews: metricsRaw.total_sessions || 0,
          trend_direction: metricsRaw.overall_score >= 70 ? 'improving' as const
            : metricsRaw.overall_score >= 50 ? 'stable' as const
            : 'declining' as const
        } : null
      }

      // Transform producer progress
      let transformedProgress: ProducerProgress[] = []
      
      if (startDate && endDate) {
        // Using date-range functions - different response structure
        transformedProgress = progressRaw.map(p => ({
          name: p.producer_name || '',
          producer_name: p.producer_name || '',
          producer_id: p.producer_id,
          baseline: { dials: 0, talk_time: 0, quoted_hh: 0, items_sold: 0 },
          current: { dials: 0, talk_time: 0, quoted_hh: 0, items_sold: 0 },
          coaching_sessions: p.total_reviews || 0,
          gaps_addressed: p.resolved_gaps || 0,
          gaps_identified: p.total_gaps || 0,
          improvement_rate: p.total_gaps > 0 ? Math.round((p.resolved_gaps / p.total_gaps) * 100) : 0,
          status: p.trend === 'improving' ? 'excellent' as const : p.trend === 'declining' ? 'steady' as const : 'improving' as const,
          last_coached: null,
          total_reviews: p.total_reviews || 0,
          resolved_issues: p.resolved_gaps || 0,
          unresolved_issues: Math.max(0, (p.total_gaps || 0) - (p.resolved_gaps || 0)),
          resolution_rate: p.total_gaps > 0 ? Math.round((p.resolved_gaps / p.total_gaps) * 100) : 0,
          avg_days_between_reviews: p.avg_days_to_resolve || 7,
          trend: p.trend || 'stable',
          last_review_date: null
        }))
      } else {
        // Using days_back functions - original response structure
        transformedProgress = progressRaw.map(p => ({
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
      }

      // Transform gap analysis
      let transformedGaps: GapAnalysis[] = []
      
      if (startDate && endDate) {
        // Using date-range functions - different response structure
        transformedGaps = gapsRaw.map(g => ({
          category: g.category || '',
          gap_category: g.category || '',
          frequency: g.total_occurrences || 0,
          severity: g.total_occurrences > 10 ? 'high' as const : g.total_occurrences > 5 ? 'medium' as const : 'low' as const,
          avg_resolution_days: g.avg_time_to_resolve || 0,
          success_rate: g.total_occurrences > 0 ? Math.round((g.resolved_count / g.total_occurrences) * 100) : 0,
          resolution_rate: g.total_occurrences > 0 ? Math.round((g.resolved_count / g.total_occurrences) * 100) : 0,
          affected_producers: [],
          affected_producers_count: g.affected_producers || 0
        }))
      } else {
        // Using days_back functions - original response structure
        transformedGaps = gapsRaw.map(g => ({
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
      }

      // Transform weekly trends
      const transformedTrends: WeeklyTrend[] = trendsRaw
        .map(t => {
          const weekStart = startDate && endDate 
            ? (t.week_start || '')
            : parseWeekStart(t.week || '', t.week_start || t.week_start_date || t.start_date)
          return {
            week: startDate && endDate ? (t.week_start ? format(new Date(t.week_start), 'MMM dd') : '') : (t.week || ''),
            identified: startDate && endDate ? (t.gaps_identified || 0) : (t.identified || 0),
            resolved: startDate && endDate ? (t.gaps_resolved || 0) : (t.resolved || 0),
            effectiveness: startDate && endDate ? (t.resolution_rate || 0) : (t.effectiveness || 0),
            week_start: weekStart,
            resolution_rate: startDate && endDate ? (t.resolution_rate || 0) : (t.effectiveness || 0),
            avg_effectiveness_score: startDate && endDate ? (t.resolution_rate || 0) : (t.effectiveness || 0),
            reviews_count: startDate && endDate ? (t.reviews_count || 0) : (t.identified || 0)
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

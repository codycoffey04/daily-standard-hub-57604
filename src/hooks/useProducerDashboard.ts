import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// TypeScript interfaces for dashboard data
export interface ProducerDashboardScorecard {
  items_mtd: number
  premium_mtd: number
  close_rate: number
  framework_compliance_pct: number
  qhh_mtd: number
  sales_mtd: number
  total_entries: number
  top_entries: number
}

export interface TeamStanding {
  producer_id: string
  producer_name: string
  items: number
  rank: number
  is_me: boolean
}

export interface ProducerDashboardTeamStandings {
  my_rank: number
  total_producers: number
  standings: TeamStanding[]
}

export interface ProducerDashboardPace {
  personal_goal: number
  current_items: number
  workdays_elapsed: number
  workdays_remaining: number
  items_per_day_needed: number
  on_pace: boolean
}

export interface ProducerDashboardVCCountdown {
  agency_target: number
  agency_current: number
  agency_gap: number
  days_remaining: number
  producer_contribution: number
  producer_contribution_pct: number
}

export interface ProducerDashboardStreaks {
  win_streak: number
  is_hot: boolean
  recent_items_3d: number
  velocity_vs_avg: number
}

export interface ProducerDashboardData {
  scorecard: ProducerDashboardScorecard
  team_standings: ProducerDashboardTeamStandings
  pace: ProducerDashboardPace
  vc_countdown: ProducerDashboardVCCountdown
  streaks: ProducerDashboardStreaks
}

// Helper to safely convert unknown values to numbers
function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : fallback
}

// Helper to safely convert unknown values to booleans
function toBool(v: unknown, fallback = false): boolean {
  if (v === null || v === undefined) return fallback
  if (typeof v === 'boolean') return v
  return fallback
}

// Parse and validate the raw JSON response from the RPC
function parseProducerDashboardData(raw: unknown): ProducerDashboardData | null {
  if (!raw || typeof raw !== 'object') return null

  const data = raw as Record<string, unknown>

  const scorecard = data.scorecard as Record<string, unknown> | undefined
  const team_standings = data.team_standings as Record<string, unknown> | undefined
  const pace = data.pace as Record<string, unknown> | undefined
  const vc_countdown = data.vc_countdown as Record<string, unknown> | undefined
  const streaks = data.streaks as Record<string, unknown> | undefined

  if (!scorecard || !team_standings || !pace || !vc_countdown || !streaks) {
    return null
  }

  return {
    scorecard: {
      items_mtd: toNum(scorecard.items_mtd),
      premium_mtd: toNum(scorecard.premium_mtd),
      close_rate: toNum(scorecard.close_rate),
      framework_compliance_pct: toNum(scorecard.framework_compliance_pct),
      qhh_mtd: toNum(scorecard.qhh_mtd),
      sales_mtd: toNum(scorecard.sales_mtd),
      total_entries: toNum(scorecard.total_entries),
      top_entries: toNum(scorecard.top_entries),
    },
    team_standings: {
      my_rank: toNum(team_standings.my_rank),
      total_producers: toNum(team_standings.total_producers),
      standings: Array.isArray(team_standings.standings)
        ? team_standings.standings.map((s: unknown) => {
            const standing = s as Record<string, unknown>
            return {
              producer_id: String(standing.producer_id || ''),
              producer_name: String(standing.producer_name || ''),
              items: toNum(standing.items),
              rank: toNum(standing.rank),
              is_me: toBool(standing.is_me),
            }
          })
        : [],
    },
    pace: {
      personal_goal: toNum(pace.personal_goal),
      current_items: toNum(pace.current_items),
      workdays_elapsed: toNum(pace.workdays_elapsed),
      workdays_remaining: toNum(pace.workdays_remaining),
      items_per_day_needed: toNum(pace.items_per_day_needed),
      on_pace: toBool(pace.on_pace),
    },
    vc_countdown: {
      agency_target: toNum(vc_countdown.agency_target),
      agency_current: toNum(vc_countdown.agency_current),
      agency_gap: toNum(vc_countdown.agency_gap),
      days_remaining: toNum(vc_countdown.days_remaining),
      producer_contribution: toNum(vc_countdown.producer_contribution),
      producer_contribution_pct: toNum(vc_countdown.producer_contribution_pct),
    },
    streaks: {
      win_streak: toNum(streaks.win_streak),
      is_hot: toBool(streaks.is_hot),
      recent_items_3d: toNum(streaks.recent_items_3d),
      velocity_vs_avg: toNum(streaks.velocity_vs_avg),
    },
  }
}

export function useProducerDashboard(producerId: string | null | undefined) {
  return useQuery({
    queryKey: ['producer-dashboard', producerId],
    queryFn: async (): Promise<ProducerDashboardData | null> => {
      if (!producerId) return null

      const { data, error } = await supabase.rpc('get_producer_dashboard', {
        p_producer_id: producerId,
      })

      if (error) {
        console.error('Error fetching producer dashboard:', error)
        throw error
      }

      return parseProducerDashboardData(data)
    },
    enabled: !!producerId,
    staleTime: 30000, // 30 seconds - balance freshness with performance
    refetchOnWindowFocus: true,
  })
}

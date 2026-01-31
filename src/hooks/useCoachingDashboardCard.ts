import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

type CoachingType = 'sales' | 'service'

// Step names for display
export const SALES_STEP_NAMES: Record<string, string> = {
  step_1_opening: 'Opening',
  step_2_discovery: 'Discovery',
  step_3_quoting: 'Quoting',
  step_4_ask_for_sale: 'Ask for Sale',
  step_5_closing: 'Closing',
  step_6_follow_up: 'Follow-up',
  step_7_multi_line: 'Multi-line',
  step_8_referral_ask: 'Referral Ask'
}

export const SERVICE_STEP_NAMES: Record<string, string> = {
  step_1_greeting: 'Greeting',
  step_2_listening_empathy: 'Listening/Empathy',
  step_3_problem_id: 'Problem ID',
  step_4_resolution: 'Resolution',
  step_5_cross_sell: 'Cross-Sell',
  step_6_referral_ask_csr: 'Referral Ask',
  step_7_retention: 'Retention'
}

export interface WeekData {
  week_start: string
  focus_theme: string
  focus_challenge: string | null
  transcript_count: number
  overall_avg: number
  step_averages: Record<string, number>
  google_review_ask_rate?: number // Service only
}

export interface DeltaData {
  overall: number
}

export interface CoachingDashboardData {
  current_week: WeekData | null
  previous_week: Omit<WeekData, 'focus_challenge' | 'google_review_ask_rate'> | null
  delta: DeltaData | null
}

// Helper to find strongest/weakest steps
export function findStrongestWeakest(stepAverages: Record<string, number>): {
  strongest: { step: string; score: number }
  weakest: { step: string; score: number }
} {
  const entries = Object.entries(stepAverages).filter(([_, score]) => score !== null)

  if (entries.length === 0) {
    return {
      strongest: { step: '', score: 0 },
      weakest: { step: '', score: 0 }
    }
  }

  const sorted = entries.sort((a, b) => b[1] - a[1])

  return {
    strongest: { step: sorted[0][0], score: sorted[0][1] },
    weakest: { step: sorted[sorted.length - 1][0], score: sorted[sorted.length - 1][1] }
  }
}

export function useCoachingDashboardCard(
  memberId: string | undefined,
  coachingType: CoachingType,
  isCsr: boolean = false
) {
  return useQuery({
    queryKey: ['coaching-dashboard-card', memberId, coachingType, isCsr],
    queryFn: async (): Promise<CoachingDashboardData | null> => {
      if (!memberId) return null

      const { data, error } = await supabase.rpc('get_coaching_score_comparison', {
        p_member_id: memberId,
        p_coaching_type: coachingType,
        p_is_csr: isCsr
      })

      if (error) {
        console.error('[useCoachingDashboardCard] RPC error:', error)
        throw error
      }

      // RPC returns null if no current week episode exists
      if (!data) return null

      return data as CoachingDashboardData
    },
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  })
}

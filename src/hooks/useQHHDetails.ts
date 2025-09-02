import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface QHHDetail {
  id: string
  full_name: string
  phone_number: string
  policies_quoted: number
  lead_source_id: string
  notes: string | null
  quick_action_status: string
  opted_into_hearsay: boolean
  source_name: string
}

export interface QHHAnalytics {
  totalCount: number
  statusBreakdown: Record<string, number>
  sourceBreakdown: Record<string, { count: number; successRate: number }>
  conversionRate: number
  successfulStatuses: string[]
  failurePatterns: string[]
}

const SUCCESSFUL_STATUSES = ['Quoted', 'SOLD']

export const useQHHDetails = (dailyEntryId: string | null) => {
  return useQuery({
    queryKey: ['qhh-details', dailyEntryId],
    queryFn: async (): Promise<{ qhh: QHHDetail[]; analytics: QHHAnalytics }> => {
      if (!dailyEntryId) throw new Error('Daily entry ID is required')

      // First, get the quoted households
      const { data: qhhData, error: qhhError } = await supabase
        .rpc('sql', {
          query: `
            SELECT qh.*, s.name as source_name
            FROM quoted_households qh
            LEFT JOIN sources s ON qh.lead_source_id = s.id
            WHERE qh.daily_entry_id = $1
            ORDER BY qh.created_at ASC
          `,
          params: [dailyEntryId]
        })

      if (qhhError) throw qhhError

      const qhh: QHHDetail[] = qhhData || []

      // Calculate analytics
      const totalCount = qhh.length
      const statusBreakdown = qhh.reduce((acc, item) => {
        acc[item.quick_action_status] = (acc[item.quick_action_status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const sourceBreakdown = qhh.reduce((acc, item) => {
        const sourceName = item.source_name || 'Unknown'
        if (!acc[sourceName]) {
          acc[sourceName] = { count: 0, successRate: 0 }
        }
        acc[sourceName].count++
        return acc
      }, {} as Record<string, { count: number; successRate: number }>)

      // Calculate success rates for each source
      Object.keys(sourceBreakdown).forEach(sourceName => {
        const sourceQHH = qhh.filter(item => (item.source_name || 'Unknown') === sourceName)
        const successCount = sourceQHH.filter(item => 
          SUCCESSFUL_STATUSES.includes(item.quick_action_status)
        ).length
        sourceBreakdown[sourceName].successRate = 
          sourceQHH.length > 0 ? (successCount / sourceQHH.length) * 100 : 0
      })

      const successfulCount = qhh.filter(item => 
        SUCCESSFUL_STATUSES.includes(item.quick_action_status)
      ).length
      const conversionRate = totalCount > 0 ? (successfulCount / totalCount) * 100 : 0

      // Identify failure patterns
      const failurePatterns: string[] = []
      const failureStatuses = Object.entries(statusBreakdown)
        .filter(([status]) => !SUCCESSFUL_STATUSES.includes(status))
        .sort(([,a], [,b]) => b - a)

      if (failureStatuses.length > 0) {
        const topFailure = failureStatuses[0]
        if (topFailure[1] > 1) {
          failurePatterns.push(`${topFailure[1]} leads resulted in "${topFailure[0]}"`)
        }
      }

      // Check for poor source performance
      Object.entries(sourceBreakdown).forEach(([sourceName, data]) => {
        if (data.count >= 2 && data.successRate === 0) {
          failurePatterns.push(`${sourceName} had 0% success rate (${data.count} leads)`)
        }
      })

      const analytics: QHHAnalytics = {
        totalCount,
        statusBreakdown,
        sourceBreakdown,
        conversionRate,
        successfulStatuses: SUCCESSFUL_STATUSES,
        failurePatterns
      }

      return { qhh, analytics }
    },
    enabled: !!dailyEntryId
  })
}
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface QHHDetail {
  id: string
  zip_code: string
  product_lines: string[]
  lines_quoted: number
  is_bundle: boolean
  quoted_premium: number
  lead_source_id: string | null
  current_carrier: string | null
  lead_id: string | null
  qcn: string | null
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

      // Use the database function to get QHH details with source names
      const { data, error } = await supabase
        .rpc('get_qhh_details_for_review', {
          p_daily_entry_id: dailyEntryId
        })

      if (error) throw error

      const qhh: QHHDetail[] = (data as QHHDetail[]) || []

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
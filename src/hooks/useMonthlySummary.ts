import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import dayjs from 'dayjs'

export interface MonthlySummaryData {
  month_key: string
  qhh_total: number
  quotes_total: number
  dials_total: number
  talk_minutes_total: number
  framework_compliance_pct: number
  avg_qhh_per_producer: number
  avg_quotes_per_producer: number
}

export interface TopSourceData {
  source_name: string
  metric_value: number
  percentage: number
}

export const useMonthlySummary = (year: number, month: number | null) => {
  return useQuery({
    queryKey: ['monthly-summary', year, month],
    queryFn: async (): Promise<MonthlySummaryData[]> => {
      let fromDate: string
      let toDate: string

      if (month) {
        // Specific month selected
        fromDate = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      } else {
        // Entire year - show last 6 months by default
        const sixMonthsAgo = dayjs().subtract(6, 'months').startOf('month')
        fromDate = sixMonthsAgo.format('YYYY-MM-DD')
        toDate = dayjs().format('YYYY-MM-DD')
      }

      const { data, error } = await supabase.rpc('get_monthly_summary' as any, {
        from_date: fromDate,
        to_date: toDate
      }) as { data: MonthlySummaryData[] | null, error: any }

      if (error) throw error
      return data || []
    }
  })
}

export const useTopSourcesByMonth = (targetMonth: string | null, metricType: 'quotes' | 'qhh') => {
  return useQuery({
    queryKey: ['top-sources-by-month', targetMonth, metricType],
    queryFn: async (): Promise<TopSourceData[]> => {
      if (!targetMonth) return []

      const { data, error } = await supabase.rpc('get_top_sources_by_month' as any, {
        target_month: targetMonth,
        metric_type: metricType
      }) as { data: TopSourceData[] | null, error: any }

      if (error) throw error
      return data || []
    },
    enabled: !!targetMonth
  })
}

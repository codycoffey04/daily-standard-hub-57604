import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import dayjs from 'dayjs'

export interface MonthlySummaryData {
  month_date: string
  month_name: string
  total_qhh: number
  total_quotes: number
  total_dials: number
  total_talk_minutes: number
  framework_compliance_pct: number
  avg_qhh_per_producer: number
  avg_quotes_per_producer: number
  total_entries?: number
  total_items?: number
  unique_producers?: number
  top_framework_entries?: number
  bottom_framework_entries?: number
  outside_framework_entries?: number
  qhh_to_quote_conversion?: number
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
        // Entire year - show full year when no month selected
        fromDate = `${year}-01-01`
        toDate = `${year}-12-31`
      }

      const { data, error } = await supabase.rpc('get_monthly_summary' as any, {
        from_date: fromDate,
        to_date: toDate
      }) as { data: MonthlySummaryData[] | null, error: any }

      console.log('📅 Date range being queried:', { fromDate, toDate })
      console.log('📊 Monthly summary data received:', data)
      console.log('📊 Number of months:', data?.length)
      console.log('📊 First row:', data?.[0])
      console.log('📊 All month_date values:', data?.map(d => d.month_date))

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

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import dayjs from 'dayjs'

export interface MonthlySummaryData {
  month_date: string
  month_name: string
  total_qhh: number
  total_quotes: number
  total_dials: number
  total_talk_time: number
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
    queryKey: ['monthly-summary-v3', year, month],
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<MonthlySummaryData> => {
      // Calculate the date range (first and last day of month)
      const fromDate = month 
        ? `${year}-${String(month).padStart(2, '0')}-01`
        : `${year}-01-01`
      
      const toDate = month
        ? `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
        : `${year}-12-31`

      console.log('📅 === MONTHLY SUMMARY RPC CALL ===')
      console.log('  Input - year:', year, 'month:', month)
      console.log('  Calculated fromDate:', fromDate, 'toDate:', toDate)
      console.log('  Exact RPC params:', JSON.stringify({ from_date: fromDate, to_date: toDate }, null, 2))
      console.log('  About to call: supabase.rpc("get_monthly_summary", {...})')

      const { data, error } = await supabase.rpc('get_monthly_summary' as any, {
        from_date: fromDate,
        to_date: toDate
      }) as { data: MonthlySummaryData[] | null, error: any }

      console.log('📊 Monthly summary data received:', data)
      console.log('  Is Array:', Array.isArray(data))
      console.log('  Array length:', data?.length)
      console.log('  First item:', data?.[0])

      if (error) {
        console.error('❌ Error from get_monthly_summary:', error)
        throw error
      }

      // Access first element of the array
      const summaryData = data && data.length > 0 ? data[0] : null

      console.log('  Extracted summaryData:', summaryData)
      console.log('  Total QHH:', summaryData?.total_qhh)
      console.log('  Total Quotes:', summaryData?.total_quotes)
      console.log('  Total Dials:', summaryData?.total_dials)
      console.log('  Total Talk Time:', summaryData?.total_talk_time)

      // Return single object (first element of array)
      return summaryData || {
        month_date: fromDate,
        month_name: '',
        total_qhh: 0,
        total_quotes: 0,
        total_dials: 0,
        total_talk_time: 0,
        framework_compliance_pct: 0,
        avg_qhh_per_producer: 0,
        avg_quotes_per_producer: 0
      }
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

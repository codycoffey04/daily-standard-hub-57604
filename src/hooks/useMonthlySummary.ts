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
    queryKey: ['monthly-summary-v4', year, month],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    queryFn: async (): Promise<MonthlySummaryData> => {
      // Calculate month_ym in 'YYYY-MM' format
      const monthYm = month 
        ? `${year}-${String(month).padStart(2, '0')}`
        : `${year}-01`

      console.log('📅 === MONTHLY SUMMARY RPC CALL (NEW) ===')
      console.log('  Input - year:', year, 'month:', month)
      console.log('  Calculated month_ym:', monthYm)
      console.log('  Exact RPC params:', JSON.stringify({ month_ym: monthYm }, null, 2))

      const { data, error } = await supabase.rpc('rpc_get_monthly_summary' as any, {
        month_ym: monthYm
      }) as { data: MonthlySummaryData[] | null, error: any }

      console.log('📊 Monthly summary data received:', data)
      console.log('  Is Array:', Array.isArray(data))
      console.log('  Array length:', data?.length)

      if (error) {
        console.error('❌ Error from rpc_get_monthly_summary:', error)
        throw error
      }

      // Access first element of the array
      let summaryData = data && data.length > 0 ? data[0] : null

      console.log('  Extracted summaryData:', summaryData)
      console.log('  Total QHH:', summaryData?.total_qhh)
      console.log('  Total Quotes:', summaryData?.total_quotes)
      console.log('  Framework Compliance % (from DB):', summaryData?.framework_compliance_pct)
      console.log('  Total Entries:', summaryData?.total_entries)
      console.log('  Top Framework Entries:', summaryData?.top_framework_entries)
      console.log('  Bottom Framework Entries:', summaryData?.bottom_framework_entries)
      console.log('  Outside Framework Entries:', summaryData?.outside_framework_entries)
      console.log('  Full summaryData object keys:', summaryData ? Object.keys(summaryData) : 'null')

      // If framework data is missing or zero, fetch it directly from the database
      // Check if we need to fetch framework data (if it's missing or if compliance is 0 but we have entries)
      const needsFrameworkData = summaryData && (
        !summaryData.total_entries || 
        (summaryData.framework_compliance_pct === 0 && summaryData.total_qhh > 0)
      )

      if (needsFrameworkData) {
        console.log('🔍 Framework data missing or zero, fetching directly from database...')
        
        // Calculate date range for the month
        const startDate = `${monthYm}-01`
        const endDate = month 
          ? dayjs(`${year}-${String(month).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD')
          : dayjs(`${year}-01-01`).endOf('month').format('YYYY-MM-DD')

        console.log('  Querying entry_status for dates:', startDate, 'to', endDate)

        // Query framework status counts directly from entry_status view
        const { data: frameworkData, error: frameworkError } = await supabase
          .from('entry_status')
          .select('framework_status, entry_date')
          .gte('entry_date', startDate)
          .lte('entry_date', endDate)

        if (!frameworkError && frameworkData && frameworkData.length > 0) {
          const totalEntries = frameworkData.length
          // Handle both 'TOP'/'BOTTOM'/'OUTSIDE' and 'Top'/'Bottom'/'Outside' formats
          const topEntries = frameworkData.filter(e => 
            e.framework_status === 'TOP' || e.framework_status === 'Top'
          ).length
          const bottomEntries = frameworkData.filter(e => 
            e.framework_status === 'BOTTOM' || e.framework_status === 'Bottom'
          ).length
          const outsideEntries = frameworkData.filter(e => 
            e.framework_status === 'OUTSIDE' || e.framework_status === 'Outside'
          ).length
          const frameworkCompliancePct = totalEntries > 0 ? (topEntries / totalEntries) * 100 : 0

          console.log('  ✅ Fetched framework data:')
          console.log('    Total Entries:', totalEntries)
          console.log('    Top Entries:', topEntries)
          console.log('    Bottom Entries:', bottomEntries)
          console.log('    Outside Entries:', outsideEntries)
          console.log('    Framework Compliance %:', frameworkCompliancePct.toFixed(1))

          // Merge framework data into summaryData
          summaryData = {
            ...summaryData,
            total_entries: totalEntries,
            top_framework_entries: topEntries,
            bottom_framework_entries: bottomEntries,
            outside_framework_entries: outsideEntries,
            framework_compliance_pct: frameworkCompliancePct
          }
        } else if (frameworkError) {
          console.error('❌ Error fetching framework data:', frameworkError)
        } else {
          console.log('  ⚠️ No framework data found for this period')
        }
      }

      // Return single object
      return summaryData || {
        month_date: `${monthYm}-01`,
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

export const useTopSourcesByMonth = (monthYm: string | null, metricType: 'quotes' | 'qhh') => {
  return useQuery({
    queryKey: ['top-sources-by-month-v2', monthYm, metricType],
    queryFn: async (): Promise<TopSourceData[]> => {
      if (!monthYm) return []

      console.log('📊 === TOP SOURCES RPC CALL (NEW) ===')
      console.log('  month_ym:', monthYm)
      console.log('  metric_type:', metricType)

      const { data, error } = await supabase.rpc('rpc_get_top_sources_by_month' as any, {
        month_ym: monthYm,
        metric_type: metricType
      }) as { data: TopSourceData[] | null, error: any }

      if (error) {
        console.error('❌ Error from rpc_get_top_sources_by_month:', error)
        throw error
      }
      
      // Filter out sources with zero values
      return (data || []).filter(item => item.metric_value > 0)
    },
    enabled: !!monthYm
  })
}

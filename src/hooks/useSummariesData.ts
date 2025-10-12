import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface QHHBySourceData {
  source_name: string
  qhh: number
}

export interface QuotesByProducerData {
  producer_name: string
  quotes: number
}

export interface QuotesBySourceData {
  source_name: string
  quotes: number
}

export interface ItemsByProducerData {
  producer_name: string
  items: number
}

export interface ItemsBySourceData {
  source_id: string
  source_name: string
  qhh: number
  quotes: number
  items: number
  items_per_qhh: number | null
  items_per_quote: number | null
  qhh_rows_detail: number
  detail_coverage_pct: number | null
  bundle_rate: number | null
  avg_quoted_premium: number | null
  avg_sold_quote_premium: number | null
}

export interface ProducerSourceMatrixData {
  producer_name: string
  source_name: string
  quotes: number
  qhh: number
  items: number
}

export interface CloseRateData {
  source_name: string
  close_rate: number
  items: number
  qhh: number
}

export interface SourceROIData {
  source_id: string
  source_name: string
  qhh: number
  quotes: number
  items: number
  spend: number | null
  cost_per_qhh: number | null
  cost_per_item: number | null
  sold_premium_total: number | null
  ltv_estimate: number | null
  roi: number | null
  recommendation: string | null
}

export interface SalesByProducerData {
  producer_id: string
  producer_name: string
  days_worked: number
  days_top: number
  days_bottom: number
  days_outside: number
  framework_compliance_pct: number
  avg_daily_qhh: number
  avg_daily_items: number
  total_qhh: number
  total_quotes: number
  total_items: number
  total_premium: number
  total_commission: number
  // For trend comparison
  prev_framework_compliance_pct?: number
  prev_total_items?: number
}

function getDateRange(year: number, month: number | null) {
  if (month === null) {
    // Full year
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    }
  } else {
    // Specific month
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0] // Last day of month
    return { startDate, endDate }
  }
}

export function useQHHBySource(year: number, month: number | null) {
  return useQuery({
    queryKey: ['qhh-by-source', year, month],
    queryFn: async (): Promise<QHHBySourceData[]> => {
      const { startDate, endDate } = getDateRange(year, month)
      
      const { data, error } = await supabase
        .from('daily_entry_sources')
        .select(`
          qhh,
          sources!inner(name),
          daily_entries!inner(entry_date)
        `)
        .gte('daily_entries.entry_date', startDate)
        .lte('daily_entries.entry_date', endDate)
      
      if (error) throw error
      
      // Group by source and sum QHH
      const grouped = data.reduce((acc: Record<string, number>, item: any) => {
        const sourceName = item.sources.name
        acc[sourceName] = (acc[sourceName] || 0) + item.qhh
        return acc
      }, {})
      
      return Object.entries(grouped)
        .map(([source_name, qhh]) => ({ source_name, qhh }))
        .sort((a, b) => b.qhh - a.qhh)
    }
  })
}

export function useQHHByProducer(year: number, month: number | null) {
  const { startDate, endDate } = getDateRange(year, month)
  
  return useQuery({
    queryKey: ['qhh-by-producer', year, month],
    queryFn: async () => {
      const query = supabase
        .from('daily_entries')
        .select(`
          producer_id,
          producers!inner(display_name),
          daily_entry_sources!inner(qhh)
        `)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)

      const { data, error } = await query

      if (error) throw error

      // Group by producer and sum QHH
      const producerMap = new Map<string, { producer: string, qhh: number }>()

      data?.forEach((entry: any) => {
        const producerName = entry.producers.display_name
        entry.daily_entry_sources.forEach((source: any) => {
          const existing = producerMap.get(producerName) || { producer: producerName, qhh: 0 }
          existing.qhh += source.qhh || 0
          producerMap.set(producerName, existing)
        })
      })

      return Array.from(producerMap.values()).sort((a, b) => b.qhh - a.qhh)
    }
  })
}

export function useQuotesByProducer(year: number, month: number | null) {
  return useQuery({
    queryKey: ['quotes-by-producer', year, month],
    queryFn: async (): Promise<QuotesByProducerData[]> => {
      const { startDate, endDate } = getDateRange(year, month)
      
      const { data, error } = await supabase
        .from('daily_entry_sources')
        .select(`
          quotes,
          daily_entries!inner(
            producer_id,
            entry_date,
            producers!inner(display_name)
          )
        `)
        .gte('daily_entries.entry_date', startDate)
        .lte('daily_entries.entry_date', endDate)
      
      if (error) throw error
      
      // Group by producer and sum quotes
      const grouped = data.reduce((acc: Record<string, number>, item: any) => {
        const producerName = item.daily_entries.producers.display_name
        acc[producerName] = (acc[producerName] || 0) + item.quotes
        return acc
      }, {})
      
      return Object.entries(grouped)
        .map(([producer_name, quotes]) => ({ producer_name, quotes }))
        .sort((a, b) => b.quotes - a.quotes)
    }
  })
}

export function useQuotesBySource(year: number, month: number | null) {
  return useQuery({
    queryKey: ['quotes-by-source', year, month],
    queryFn: async (): Promise<QuotesBySourceData[]> => {
      const { startDate, endDate } = getDateRange(year, month)
      
      const { data, error } = await supabase
        .from('daily_entry_sources')
        .select(`
          quotes,
          sources!inner(name),
          daily_entries!inner(entry_date)
        `)
        .gte('daily_entries.entry_date', startDate)
        .lte('daily_entries.entry_date', endDate)
      
      if (error) throw error
      
      // Group by source and sum quotes
      const grouped = data.reduce((acc: Record<string, number>, item: any) => {
        const sourceName = item.sources.name
        acc[sourceName] = (acc[sourceName] || 0) + item.quotes
        return acc
      }, {})
      
      return Object.entries(grouped)
        .map(([source_name, quotes]) => ({ source_name, quotes }))
        .sort((a, b) => b.quotes - a.quotes)
    }
  })
}

export function useItemsByProducer(year: number, month: number | null) {
  return useQuery({
    queryKey: ['items-by-producer', year, month],
    queryFn: async (): Promise<ItemsByProducerData[]> => {
      const { startDate, endDate } = getDateRange(year, month)
      
      const { data, error } = await supabase
        .from('daily_entries')
        .select(`
          items_total,
          producers!inner(display_name)
        `)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
      
      if (error) throw error
      
      // Group by producer and sum items
      const grouped = data.reduce((acc: Record<string, number>, item: any) => {
        const producerName = item.producers.display_name
        acc[producerName] = (acc[producerName] || 0) + item.items_total
        return acc
      }, {})
      
      return Object.entries(grouped)
        .map(([producer_name, items]) => ({ producer_name, items }))
        .sort((a, b) => b.items - a.items)
    }
  })
}

export function useItemsBySource(year: number, month: number | null) {
  return useQuery({
    queryKey: ['items-by-source', year, month],
    queryFn: async (): Promise<ItemsBySourceData[]> => {
      const { startDate, endDate } = getDateRange(year, month)
      
      const { data, error } = await supabase.rpc(
        'get_items_by_source' as any,
        {
          from_date: startDate,
          to_date: endDate
        }
      )
      
      if (error) throw error
      
      return (data as ItemsBySourceData[]) || []
    }
  })
}

export function useProducerSourceMatrix(year: number, month: number | null) {
  return useQuery({
    queryKey: ['producer-source-matrix', year, month],
    queryFn: async (): Promise<ProducerSourceMatrixData[]> => {
      const { startDate, endDate } = getDateRange(year, month)
      
      const { data, error } = await supabase
        .from('daily_entry_sources')
        .select(`
          quotes,
          qhh,
          items,
          sources!inner(name),
          daily_entries!inner(
            entry_date,
            producers!inner(display_name)
          )
        `)
        .gte('daily_entries.entry_date', startDate)
        .lte('daily_entries.entry_date', endDate)
      
      if (error) throw error
      
      // Group by producer-source combination
      const grouped = data.reduce((acc: Record<string, any>, item: any) => {
        const key = `${item.daily_entries.producers.display_name}|${item.sources.name}`
        if (!acc[key]) {
          acc[key] = {
            producer_name: item.daily_entries.producers.display_name,
            source_name: item.sources.name,
            quotes: 0,
            qhh: 0,
            items: 0
          }
        }
        acc[key].quotes += item.quotes
        acc[key].qhh += item.qhh
        acc[key].items += item.items
        return acc
      }, {})
      
      return Object.values(grouped)
    }
  })
}

export function useCloseRateAnalysis(year: number, month: number | null) {
  return useQuery({
    queryKey: ['close-rate-analysis', year, month],
    queryFn: async (): Promise<CloseRateData[]> => {
      const { startDate, endDate } = getDateRange(year, month)
      
      const { data, error } = await supabase
        .from('daily_entry_sources')
        .select(`
          qhh,
          items,
          sources!inner(name),
          daily_entries!inner(entry_date)
        `)
        .gte('daily_entries.entry_date', startDate)
        .lte('daily_entries.entry_date', endDate)
      
      if (error) throw error
      
      // Group by source and calculate close rates
      const grouped = data.reduce((acc: Record<string, { qhh: number, items: number }>, item: any) => {
        const sourceName = item.sources.name
        if (!acc[sourceName]) {
          acc[sourceName] = { qhh: 0, items: 0 }
        }
        acc[sourceName].qhh += item.qhh
        acc[sourceName].items += item.items
        return acc
      }, {})
      
      return Object.entries(grouped)
        .map(([source_name, data]) => ({
          source_name,
          qhh: data.qhh,
          items: data.items,
          close_rate: data.qhh > 0 ? (data.items / data.qhh) * 100 : 0
        }))
        .sort((a, b) => b.close_rate - a.close_rate)
    }
  })
}

export function useSourceROI(
  year: number, 
  month: number | null,
  meetingVCGoal: boolean = true
) {
  return useQuery({
    queryKey: ['source-roi', year, month, meetingVCGoal],
    queryFn: async (): Promise<SourceROIData[]> => {
      const { startDate, endDate } = getDateRange(year, month)
      
      const { data, error } = await supabase.rpc('get_source_roi' as any, {
        from_date: startDate,
        to_date: endDate,
        meeting_vc_goal: meetingVCGoal
      })
      
      if (error) throw error
      
      return (data as SourceROIData[]) || []
    }
  })
}

function getPreviousPeriodDates(year: number, month: number | null) {
  if (month === null) {
    // Previous year
    return {
      startDate: `${year - 1}-01-01`,
      endDate: `${year - 1}-12-31`
    }
  } else {
    // Previous month
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const startDate = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-01`
    const endDate = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0]
    return { startDate, endDate }
  }
}

export function useSalesByProducer(year: number, month: number | null) {
  return useQuery({
    queryKey: ['sales-by-producer', year, month],
    queryFn: async (): Promise<SalesByProducerData[]> => {
      const { startDate, endDate } = getDateRange(year, month)
      
      // Current period data
      const { data: currentData, error: currentError } = await supabase.rpc(
        'get_producer_comparison' as any,
        {
          from_date: startDate,
          to_date: endDate
        }
      )
      
      if (currentError) throw currentError
      
      // Previous period data for trends
      const prevDates = getPreviousPeriodDates(year, month)
      const { data: prevData, error: prevError } = await supabase.rpc(
        'get_producer_comparison' as any,
        {
          from_date: prevDates.startDate,
          to_date: prevDates.endDate
        }
      )
      
      if (prevError) throw prevError
      
      // Merge current and previous data
      const prevMap = new Map(
        (prevData || []).map((p: any) => [p.producer_id, p])
      )
      
      return (currentData || []).map((current: any) => {
        const prev = prevMap.get(current.producer_id) as any
        return {
          ...current,
          prev_framework_compliance_pct: prev?.framework_compliance_pct,
          prev_total_items: prev?.total_items
        }
      })
    }
  })
}
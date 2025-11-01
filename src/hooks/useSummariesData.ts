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
  total_sold_premium: number
  total_sold_items: number
  // For trend comparison
  prev_framework_compliance_pct?: number
  prev_total_items?: number
  prev_total_sold_items?: number
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
    queryKey: ['qhh-by-source-v2', year, month],
    queryFn: async (): Promise<QHHBySourceData[]> => {
      const { startDate, endDate } = getDateRange(year, month)
      
      const { data, error } = await supabase.rpc('get_items_by_source' as any, {
        from_date: startDate,
        to_date: endDate
      })

      if (error) {
        console.error('❌ Error fetching QHH by source via RPC:', error)
        throw error
      }

      // Map to existing return structure
      return (data || []).map((row: any) => ({
        source_name: row.source_name,
        qhh: Number(row.qhh) || 0
      }))
    }
  })
}

export function useQHHByProducer(year: number, month: number | null) {
  const { startDate, endDate } = getDateRange(year, month)
  
  return useQuery({
    queryKey: ['qhh-by-producer-v2', year, month],
    queryFn: async () => {
      // 1) Get daily_entry IDs + producer mapping for date range
      const { data: entries, error: entriesErr } = await supabase
        .from('daily_entries')
        .select('id, producer_id')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)

      if (entriesErr) throw entriesErr
      if (!entries || entries.length === 0) return []

      const entryIdToProducer = new Map<string, string>()
      const entryIds: string[] = []
      const producerIds = new Set<string>()

      for (const e of entries) {
        if (e?.id && e?.producer_id) {
          entryIdToProducer.set(e.id, e.producer_id)
          entryIds.push(e.id)
          producerIds.add(e.producer_id)
        }
      }

      // 2) Get QH rows for those entries
      const { data: qhRows, error: qhErr } = await supabase
        .from('quoted_households')
        .select('id, lead_id, daily_entry_id')
        .in('daily_entry_id', entryIds)

      if (qhErr) throw qhErr

      // 3) Distinct QHH per producer
      const qhhSetsByProducer = new Map<string, Set<string>>()
      for (const row of (qhRows || [])) {
        const producerId = entryIdToProducer.get(row.daily_entry_id)
        if (!producerId) continue
        if (!row.lead_id) continue
        if (!qhhSetsByProducer.has(producerId)) qhhSetsByProducer.set(producerId, new Set<string>())
        qhhSetsByProducer.get(producerId)!.add(row.lead_id)
      }

      // 4) Producer names
      const { data: producersData, error: prodErr } = await supabase
        .from('producers')
        .select('id, display_name')
        .in('id', Array.from(producerIds))

      if (prodErr) throw prodErr
      const producerName = new Map<string, string>((producersData || []).map(p => [p.id, p.display_name]))

      // 5) Shape result - Use 'producer' key to match component expectation
      const result = Array.from(qhhSetsByProducer.entries()).map(([producer_id, set]) => ({
        producer: producerName.get(producer_id) || 'Unknown',
        qhh: set.size
      }))

      result.sort((a, b) => b.qhh - a.qhh)
      return result
    }
  })
}

export function useQuotesByProducer(year: number, month: number | null) {
  return useQuery({
    queryKey: ['quotes-by-producer-v2', year, month],
    queryFn: async (): Promise<QuotesByProducerData[]> => {
      const { startDate, endDate } = getDateRange(year, month)
      
      // 1) Get daily_entry IDs + producer mapping
      const { data: entries, error: entriesErr } = await supabase
        .from('daily_entries')
        .select('id, producer_id')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)

      if (entriesErr) throw entriesErr
      if (!entries || entries.length === 0) return []

      const entryIdToProducer = new Map<string, string>()
      const entryIds: string[] = []
      const producerIds = new Set<string>()

      for (const e of entries) {
        if (e?.id && e?.producer_id) {
          entryIdToProducer.set(e.id, e.producer_id)
          entryIds.push(e.id)
          producerIds.add(e.producer_id)
        }
      }

      // 2) Quotes = sum of lines_quoted from quoted_households
      const { data: qhRows, error: qhErr } = await supabase
        .from('quoted_households')
        .select('id, daily_entry_id, lines_quoted')
        .in('daily_entry_id', entryIds)

      if (qhErr) throw qhErr

      const quotesByProducer = new Map<string, number>()
      for (const row of (qhRows || [])) {
        const producerId = entryIdToProducer.get(row.daily_entry_id)
        if (!producerId) continue
        quotesByProducer.set(producerId, (quotesByProducer.get(producerId) || 0) + (row.lines_quoted || 0))
      }

      // 3) Producer names
      const { data: producersData, error: prodErr } = await supabase
        .from('producers')
        .select('id, display_name')
        .in('id', Array.from(producerIds))

      if (prodErr) throw prodErr
      const producerName = new Map<string, string>((producersData || []).map(p => [p.id, p.display_name]))

      // 4) Shape result
      const result = Array.from(quotesByProducer.entries()).map(([producer_id, quotes]) => ({
        producer_name: producerName.get(producer_id) || 'Unknown',
        quotes
      }))

      result.sort((a, b) => b.quotes - a.quotes)
      return result
    }
  })
}

export function useQuotesBySource(year: number, month: number | null) {
  return useQuery({
    queryKey: ['quotes-by-source-v2', year, month],
    queryFn: async (): Promise<QuotesBySourceData[]> => {
      // Calculate month_ym in 'YYYY-MM' format
      const monthYm = month 
        ? `${year}-${String(month).padStart(2, '0')}`
        : `${year}-01`
      
      console.log('🔍 === QUOTES BY SOURCE RPC CALL ===')
      console.log('  Calculated month_ym:', monthYm)
      
      const { data, error } = await supabase.rpc(
        'rpc_get_top_sources_by_month' as any,
        {
          month_ym: monthYm,
          metric_type: 'quotes'
        }
      )
      
      if (error) throw error
      
      // Transform to match QuotesBySourceData interface, filtering out zero values
      return (data || [])
        .filter((item: any) => item.metric_value > 0)
        .map((item: any) => ({
          source_name: item.source_name,
          quotes: item.metric_value
        }))
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
    queryKey: ['items-by-source-v2', year, month],
    queryFn: async (): Promise<ItemsBySourceData[]> => {
      const { startDate, endDate } = getDateRange(year, month)
      
      const { data, error } = await supabase.rpc('get_items_by_source' as any, {
        from_date: startDate,
        to_date: endDate
      })
      
      if (error) {
        console.error('❌ Error fetching Items by source via RPC:', error)
        throw error
      }
      
      return (data || []).map((row: any) => ({
        source_id: row.source_id,
        source_name: row.source_name,
        qhh: Number(row.qhh) || 0,
        quotes: Number(row.quotes) || 0,
        items: Number(row.items) || 0,
        items_per_qhh: row.items_per_qhh == null ? null : Number(row.items_per_qhh),
        items_per_quote: row.items_per_quote == null ? null : Number(row.items_per_quote),
        qhh_rows_detail: Number(row.qhh_rows_detail) || 0,
        detail_coverage_pct: row.detail_coverage_pct == null ? null : Number(row.detail_coverage_pct),
        bundle_rate: row.bundle_rate == null ? null : Number(row.bundle_rate),
        avg_quoted_premium: row.avg_quoted_premium == null ? null : Number(row.avg_quoted_premium),
        avg_sold_quote_premium: row.avg_sold_quote_premium == null ? null : Number(row.avg_sold_quote_premium)
      }))
    }
  })
}

export function useProducerSourceMatrix(year: number, month: number | null) {
  return useQuery({
    queryKey: ['producer-source-matrix-v2', year, month],
    queryFn: async (): Promise<ProducerSourceMatrixData[]> => {
      const { startDate, endDate } = getDateRange(year, month)
      
      // 1) Relevant entries in range
      const { data: entries, error: entriesErr } = await supabase
        .from('daily_entries')
        .select('id, producer_id')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)

      if (entriesErr) throw entriesErr
      if (!entries || entries.length === 0) return []

      const entryIdToProducer = new Map<string, string>()
      const entryIds: string[] = []
      const producerIds = new Set<string>()
      for (const e of entries) {
        if (e?.id && e?.producer_id) {
          entryIdToProducer.set(e.id, e.producer_id)
          entryIds.push(e.id)
          producerIds.add(e.producer_id)
        }
      }

      // 2) QH rows (lead_id for QHH; items_sold and lead_source_id for metrics)
      const { data: qhRows, error: qhErr } = await supabase
        .from('quoted_households')
        .select('id, lead_id, items_sold, lead_source_id, daily_entry_id, lines_quoted')
        .in('daily_entry_id', entryIds)

      if (qhErr) throw qhErr
      if (!qhRows || qhRows.length === 0) return []

      const sourceIds = new Set<string>()
      for (const r of qhRows) if (r.lead_source_id) sourceIds.add(r.lead_source_id)

      // 3) Names lookups
      const [{ data: producersData, error: prodErr }, { data: sourcesData, error: srcErr }] = await Promise.all([
        supabase.from('producers').select('id, display_name').in('id', Array.from(producerIds)),
        supabase.from('sources').select('id, name').in('id', Array.from(sourceIds))
      ])
      if (prodErr) throw prodErr
      if (srcErr) throw srcErr

      const producerName = new Map<string, string>((producersData || []).map(p => [p.id, p.display_name]))
      const sourceName = new Map<string, string>((sourcesData || []).map(s => [s.id, s.name]))

      // 4) Build matrix: (producer_id, source_id) → { qhhSet, quotes, items }
      interface Cell { qhhSet: Set<string>; quotes: number; items: number }
      const matrix = new Map<string, Cell>()
      const makeKey = (pid: string, sid: string) => `${pid}||${sid}`

      for (const r of qhRows) {
        const producerId = entryIdToProducer.get(r.daily_entry_id)
        const sourceId = r.lead_source_id
        if (!producerId || !sourceId) continue

        const key = makeKey(producerId, sourceId)
        if (!matrix.has(key)) matrix.set(key, { qhhSet: new Set<string>(), quotes: 0, items: 0 })

        const cell = matrix.get(key)!
        if (r.lead_id) cell.qhhSet.add(r.lead_id)
        cell.quotes += (r.lines_quoted || 0)
        cell.items += Number(r.items_sold || 0)
      }

      // 5) Shape to ProducerSourceMatrixData interface
      const result = Array.from(matrix.entries()).map(([key, cell]) => {
        const [producer_id, source_id] = key.split('||')
        return {
          producer_name: producerName.get(producer_id) || 'Unknown',
          source_name: sourceName.get(source_id) || 'Unknown',
          qhh: cell.qhhSet.size,
          quotes: cell.quotes,
          items: cell.items
        }
      })

      result.sort((a, b) => (a.producer_name.localeCompare(b.producer_name) || a.source_name.localeCompare(b.source_name)))
      return result
    }
  })
}

export function useCloseRateAnalysis(year: number, month: number | null) {
  return useQuery({
    queryKey: ['close-rate-analysis-v2', year, month],
    queryFn: async (): Promise<CloseRateData[]> => {
      const { startDate, endDate } = getDateRange(year, month)
      
      // 1) Get daily_entry IDs for date range
      const { data: entries, error: entriesErr } = await supabase
        .from('daily_entries')
        .select('id')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)

      if (entriesErr) throw entriesErr
      if (!entries || entries.length === 0) return []

      const entryIds = entries.map(e => e.id).filter(Boolean)

      // 2) Get quoted_households rows (grouped by SOURCE)
      const { data: qhRows, error: qhErr } = await supabase
        .from('quoted_households')
        .select('lead_id, items_sold, lead_source_id')
        .in('daily_entry_id', entryIds)

      if (qhErr) throw qhErr
      if (!qhRows || qhRows.length === 0) return []

      // 3) Group by source: QHH = distinct lead_id, Items = sum(items_sold)
      interface SourceMetrics { qhhSet: Set<string>; items: number }
      const bySource = new Map<string, SourceMetrics>()

      for (const r of qhRows) {
        const sourceId = r.lead_source_id
        if (!sourceId) continue

        if (!bySource.has(sourceId)) {
          bySource.set(sourceId, { qhhSet: new Set<string>(), items: 0 })
        }

        const metrics = bySource.get(sourceId)!
        if (r.lead_id) metrics.qhhSet.add(r.lead_id)
        metrics.items += Number(r.items_sold || 0)
      }

      // 4) Get source names
      const sourceIds = Array.from(bySource.keys())
      const { data: sourcesData, error: srcErr } = await supabase
        .from('sources')
        .select('id, name')
        .in('id', sourceIds)

      if (srcErr) throw srcErr
      const sourceName = new Map<string, string>((sourcesData || []).map(s => [s.id, s.name]))

      // 5) Shape to CloseRateData interface
      const result = Array.from(bySource.entries()).map(([source_id, metrics]) => ({
        source_name: sourceName.get(source_id) || 'Unknown',
        qhh: metrics.qhhSet.size,
        items: metrics.items,
        close_rate: metrics.qhhSet.size > 0 ? (metrics.items / metrics.qhhSet.size) * 100 : 0
      }))

      result.sort((a, b) => b.close_rate - a.close_rate)
      return result
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
  const { startDate, endDate } = getDateRange(year, month)
  const prevDates = getPreviousPeriodDates(year, month)

  console.log('📊 useSalesByProducer called with:', { year, month })
  console.log('📅 Calculated date range:', { startDate, endDate })

  return useQuery({
    queryKey: ['sales-by-producer-v3', year, month],
    queryFn: async (): Promise<SalesByProducerData[]> => {
      console.log('🔄 Calling get_producer_trends_v3 RPC:', {
        from_date: startDate,
        to_date: endDate,
        producer_ids: null
      })
      
      // Fetch current period data using get_producer_trends_v3
      const { data: currentTrends, error: currentError } = await supabase.rpc(
        'get_producer_trends_v3' as any,
        {
          from_date: startDate,
          to_date: endDate,
          producer_ids: null // null = all producers
        }
      )
      
      if (currentError) throw currentError
      if (!currentTrends || currentTrends.length === 0) return []

      // Fetch previous period data for trend comparison
      const { data: prevTrends, error: prevError } = await supabase.rpc(
        'get_producer_trends_v3' as any,
        {
          from_date: prevDates.startDate,
          to_date: prevDates.endDate,
          producer_ids: null
        }
      )
      
      if (prevError) throw prevError

      // Aggregate daily data by producer for current period
      const producerMap = new Map<string, {
        producer_id: string
        producer_name: string
        days_worked: number
        days_top: number
        days_bottom: number
        days_outside: number
        total_qhh: number
        total_quotes: number
        total_items: number
        total_sold_items: number
        total_sold_premium: number
      }>()

      // get_producer_trends_v3 returns daily rows - aggregate by producer
      for (const row of currentTrends) {
        const existing = producerMap.get(row.producer_id)
        if (existing) {
          existing.days_worked++
          existing.days_top += (row.days_top || 0)
          existing.days_bottom += (row.days_bottom || 0)
          existing.days_outside += (row.days_outside || 0)
          existing.total_qhh += row.qhh || 0
          existing.total_quotes += row.quotes || 0
          existing.total_items += row.items || 0
          existing.total_sold_items += row.sold_items || 0
          existing.total_sold_premium += row.sold_premium || 0
        } else {
          producerMap.set(row.producer_id, {
            producer_id: row.producer_id,
            producer_name: row.producer_name,
            days_worked: 1,
            days_top: row.days_top || 0,
            days_bottom: row.days_bottom || 0,
            days_outside: row.days_outside || 0,
            total_qhh: row.qhh || 0,
            total_quotes: row.quotes || 0,
            total_items: row.items || 0,
            total_sold_items: row.sold_items || 0,
            total_sold_premium: row.sold_premium || 0
          })
        }
      }

      // Aggregate previous period data
      const prevMap = new Map<string, {
        days_worked: number
        days_top: number
        framework_compliance_pct: number
        total_items: number
        total_sold_items: number
      }>()

      if (prevTrends && prevTrends.length > 0) {
        for (const row of prevTrends) {
          const existing = prevMap.get(row.producer_id)
          if (existing) {
            existing.days_worked++
            existing.days_top += (row.days_top || 0)
            existing.total_items += row.items || 0
            existing.total_sold_items += row.sold_items || 0
          } else {
            prevMap.set(row.producer_id, {
              days_worked: 1,
              days_top: row.days_top || 0,
              framework_compliance_pct: 0, // Will be calculated
              total_items: row.items || 0,
              total_sold_items: row.sold_items || 0
            })
          }
        }
        // Calculate framework compliance % for previous period
        prevMap.forEach((prev, producerId) => {
          prev.framework_compliance_pct = prev.days_worked > 0 ? (prev.days_top / prev.days_worked) * 100 : 0
        })
      }

      // Build final result with calculated metrics
      const result: SalesByProducerData[] = Array.from(producerMap.values()).map(p => {
        const prev = prevMap.get(p.producer_id)
        const framework_compliance_pct = p.days_worked > 0 ? (p.days_top / p.days_worked) * 100 : 0
        const avg_daily_qhh = p.days_worked > 0 ? p.total_qhh / p.days_worked : 0
        const avg_daily_items = p.days_worked > 0 ? p.total_items / p.days_worked : 0

        return {
          producer_id: p.producer_id,
          producer_name: p.producer_name,
          days_worked: p.days_worked,
          days_top: p.days_top,
          days_bottom: p.days_bottom,
          days_outside: p.days_outside,
          framework_compliance_pct,
          avg_daily_qhh,
          avg_daily_items,
          total_qhh: p.total_qhh,
          total_quotes: p.total_quotes,
          total_items: p.total_items,
          total_sold_items: p.total_sold_items,
          total_sold_premium: p.total_sold_premium,
          // Previous period data for trend arrows
          prev_framework_compliance_pct: prev?.framework_compliance_pct,
          prev_total_items: prev?.total_items,
          prev_total_sold_items: prev?.total_sold_items
        }
      })

      // Sort by framework compliance (matching original behavior)
      result.sort((a, b) => b.framework_compliance_pct - a.framework_compliance_pct)

      return result
    }
  })
}
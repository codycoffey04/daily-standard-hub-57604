import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface WeeklyProducerData {
  producer_id: string
  producer_name: string
  qhh: number          // COUNT(DISTINCT lead_id)
  quotes: number       // SUM(lines_quoted)
  sales: number        // COUNT(DISTINCT lead_id WHERE items_sold > 0)
  items: number        // SUM(items_sold)
  premium: number      // SUM(quoted_premium WHERE items_sold > 0)
  close_rate: number   // (sales / qhh) * 100
}

export function useWeeklyProducerSummary(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ['weekly-producer-summary', fromDate, toDate],
    queryFn: async (): Promise<WeeklyProducerData[]> => {
      // 1) Get daily_entry IDs + producer mapping for date range
      const { data: entries, error: entriesErr } = await supabase
        .from('daily_entries')
        .select('id, producer_id')
        .gte('entry_date', fromDate)
        .lte('entry_date', toDate)

      if (entriesErr) throw entriesErr
      if (!entries || entries.length === 0) return []

      const entryIdToProducer = new Map<string, string>()
      const entryIds: string[] = []
      const producerIds = new Set<string>()

      for (const e of entries) {
        entryIds.push(e.id)
        entryIdToProducer.set(e.id, e.producer_id)
        producerIds.add(e.producer_id)
      }

      // 2) Get quoted_households for those entries
      const { data: qhRows, error: qhErr } = await supabase
        .from('quoted_households')
        .select('daily_entry_id, lead_id, lines_quoted, items_sold, quoted_premium')
        .in('daily_entry_id', entryIds)

      if (qhErr) throw qhErr

      // 3) Get producer display names
      const { data: producers, error: prodErr } = await supabase
        .from('producers')
        .select('id, display_name')
        .in('id', Array.from(producerIds))

      if (prodErr) throw prodErr

      const producerNameMap = new Map<string, string>()
      for (const p of producers || []) {
        producerNameMap.set(p.id, p.display_name)
      }

      // 4) Aggregate by producer
      const producerMetrics = new Map<string, {
        uniqueLeads: Set<string>
        soldLeads: Set<string>
        totalQuotes: number
        totalItems: number
        totalPremium: number
      }>()

      // Initialize all producers (even those with no QH rows)
      for (const producerId of producerIds) {
        producerMetrics.set(producerId, {
          uniqueLeads: new Set(),
          soldLeads: new Set(),
          totalQuotes: 0,
          totalItems: 0,
          totalPremium: 0
        })
      }

      // Aggregate QH data
      for (const row of qhRows || []) {
        const producerId = entryIdToProducer.get(row.daily_entry_id)
        if (!producerId) continue

        const metrics = producerMetrics.get(producerId)!

        // QHH: distinct lead_id
        if (row.lead_id) {
          metrics.uniqueLeads.add(row.lead_id)
        }

        // Quotes: sum of lines_quoted
        metrics.totalQuotes += row.lines_quoted || 0

        // Items sold & premium
        const itemsSold = row.items_sold || 0
        if (itemsSold > 0) {
          metrics.totalItems += itemsSold
          metrics.totalPremium += row.quoted_premium || 0
          // Sales: distinct lead_id with items_sold > 0
          if (row.lead_id) {
            metrics.soldLeads.add(row.lead_id)
          }
        }
      }

      // 5) Build result array
      const result: WeeklyProducerData[] = []
      for (const [producerId, metrics] of producerMetrics) {
        const qhh = metrics.uniqueLeads.size
        const sales = metrics.soldLeads.size
        const closeRate = qhh > 0 ? (sales / qhh) * 100 : 0

        result.push({
          producer_id: producerId,
          producer_name: producerNameMap.get(producerId) || 'Unknown',
          qhh,
          quotes: metrics.totalQuotes,
          sales,
          items: metrics.totalItems,
          premium: metrics.totalPremium,
          close_rate: closeRate
        })
      }

      // Sort by close rate descending
      result.sort((a, b) => b.close_rate - a.close_rate)

      return result
    }
  })
}

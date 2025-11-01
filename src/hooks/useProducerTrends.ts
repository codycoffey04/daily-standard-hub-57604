import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// Inline numeric coercion utility
function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

// RPC return row type (daily rows from get_producer_trends)
type RpcRow = {
  producer_id?: string
  producer_name: string
  entry_date?: string
  sold_items?: number | string | null
  sold_households?: number | string | null
  items_sold?: number | string | null
  policies_sold?: number | string | null
  outbound_dials?: number | string | null
  talk_minutes?: number | string | null
  qhh?: number | string | null
}

export type ProducerTrendsByProducer = {
  producerName: string
  items: number
  households: number
}

export type ProducerTrendsData = {
  byProducer: ProducerTrendsByProducer[]
  totals: { items: number; households: number }
}

export function useProducerTrends(
  producerIds: string[] | null,
  fromDate: string,
  toDate: string
) {
  return useQuery({
    queryKey: ['producer-trends-agg', producerIds?.join(',') ?? 'all', fromDate, toDate],
    queryFn: async (): Promise<ProducerTrendsData> => {
      const { data, error } = await supabase.rpc('get_producer_trends' as any, {
        producer_ids: producerIds,
        from_date: fromDate,
        to_date: toDate
      })

      if (error) {
        console.error('❌ get_producer_trends RPC error:', error)
        throw error
      }

      const rows: RpcRow[] = Array.isArray(data) ? data : []

      console.log(`[YTD Debug] RPC returned ${rows.length} daily rows`)

      // Aggregate daily rows by producer_name
      const producerMap = new Map<string, { name: string; items: number; households: number }>()

      for (const row of rows) {
        // Trim producer name to avoid duplicates from whitespace
        const name = (row.producer_name ?? 'Unknown').trim()
        
        // Use authoritative columns with legacy fallback
        const items = toNum(row.sold_items ?? row.items_sold)
        const households = toNum(row.sold_households ?? row.policies_sold)

        if (!producerMap.has(name)) {
          producerMap.set(name, { name, items: 0, households: 0 })
        }

        const producer = producerMap.get(name)!
        producer.items += items
        producer.households += households
      }

      console.log(`[YTD Debug] Aggregated into ${producerMap.size} unique producers`)

      // Convert to array and sort alphabetically
      const byProducer: ProducerTrendsByProducer[] = Array.from(producerMap.values())
        .map(p => ({
          producerName: p.name,
          items: p.items,
          households: p.households
        }))
        .sort((a, b) => a.producerName.localeCompare(b.producerName))

      // Compute totals from aggregated producers (not daily rows)
      const totals = byProducer.reduce(
        (acc, p) => {
          acc.items += p.items
          acc.households += p.households
          return acc
        },
        { items: 0, households: 0 }
      )

      console.log('[YTD Debug] get_producer_trends raw rows:', data)
      console.log('[YTD Debug] normalized byProducer:', byProducer)
      console.log('[YTD Debug] computed totals:', totals)

      // Freeze in dev to catch accidental mutations
      if (process.env.NODE_ENV !== 'production') {
        Object.freeze(byProducer)
        Object.freeze(totals)
      }

      return { byProducer, totals }
    },
    enabled: !!fromDate && !!toDate
  })
}

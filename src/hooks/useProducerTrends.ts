import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// Inline numeric coercion utility
function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

// RPC return row type
type RpcRow = {
  producer_id?: string
  producer_name: string
  entry_date?: string
  // Authoritative columns from get_producer_trends:
  sold_items?: number | string | null
  sold_households?: number | string | null
  // Legacy fallback columns (for backward compatibility):
  items_sold?: number | string | null
  policies_sold?: number | string | null
  // Other metrics we ignore for YTD:
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
    queryKey: ['producer-trends', producerIds?.join(',') ?? 'all', fromDate, toDate],
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

      // Aggregate by producer first (RPC returns daily rows)
      const producerMap = new Map<string, { name: string; items: number; households: number }>()

      for (const row of rows) {
        const name = row.producer_name ?? 'Unknown'
        
        // Map from authoritative columns (sold_items, sold_households)
        // with fallback to legacy names for backward compatibility
        const items = toNum(row.sold_items ?? row.items_sold)
        const households = toNum(row.sold_households ?? row.policies_sold)

        if (!producerMap.has(name)) {
          producerMap.set(name, { name, items: 0, households: 0 })
        }

        const producer = producerMap.get(name)!
        producer.items += items
        producer.households += households
      }

      // Convert to array and sort by name
      const byProducer: ProducerTrendsByProducer[] = Array.from(producerMap.values())
        .map(p => ({
          producerName: p.name,
          items: p.items,
          households: p.households
        }))
        .sort((a, b) => a.producerName.localeCompare(b.producerName))

      // Compute team totals from aggregated producers
      const totals = byProducer.reduce(
        (acc, p) => {
          acc.items += p.items
          acc.households += p.households
          return acc
        },
        { items: 0, households: 0 }
      )

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[YTD Debug] get_producer_trends raw rows:', data)
        console.debug('[YTD Debug] normalized byProducer:', byProducer)
        console.debug('[YTD Debug] computed totals:', totals)
      }

      // Freeze in dev to catch accidental mutations downstream
      if (process.env.NODE_ENV !== 'production') {
        Object.freeze(byProducer)
        Object.freeze(totals)
      }

      return { byProducer, totals }
    },
    enabled: !!fromDate && !!toDate
  })
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

/**
 * Raw row shape from get_producer_trends:
 * One row per producer per day.
 * We rely on: producer_name, sold_items, sold_households (numeric/strings)
 */
type RpcDailyRow = {
  producer_id?: string | null
  producer_name: string | null
  sold_items: number | string | null
  sold_households: number | string | null
  // (other fields like entry_date may exist; ignored here)
}

export type ProducerTrendsByProducer = {
  producerId?: string
  producerName: string
  items: number
  households: number
}

export type ProducerTrendsData = {
  byProducer: ProducerTrendsByProducer[]   // one row per producer (aggregated)
  totals: { items: number; households: number }
}

const toNum = (v: unknown, fallback = 0): number => {
  if (v === null || v === undefined || v === '') return fallback
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : fallback
}

const normalizeName = (name: string | null | undefined): string =>
  (name ?? 'Unknown').trim()

/**
 * Aggregate DAILY rows → one row per producer.
 * Group key prefers producer_id when present; falls back to normalized producer_name.
 */
const aggregateByProducer = (rows: RpcDailyRow[]): ProducerTrendsByProducer[] => {
  const map = new Map<string, ProducerTrendsByProducer>()

  for (const r of rows) {
    const name = normalizeName(r.producer_name)
    const key = (r.producer_id && r.producer_id.trim()) || name

    // Authoritative columns (do not alias to other names here)
    const items = toNum(r.sold_items)
    const households = toNum(r.sold_households)

    const acc = map.get(key) ?? {
      producerId: r.producer_id ?? undefined,
      producerName: name,
      items: 0,
      households: 0,
    }

    acc.items += items
    acc.households += households
    map.set(key, acc)
  }

  // Sort for stable UI (most items first)
  return Array.from(map.values()).sort((a, b) => b.items - a.items)
}

/**
 * Calls: get_producer_trends(producer_ids uuid[], from_date date, to_date date)
 * Pass `null` for producer_ids to fetch all producers.
 *
 * Signature kept as (producerIds, fromDate, toDate) to match existing usage.
 */
export function useProducerTrends(
  producerIds: string[] | null,
  fromDate: string,
  toDate: string
) {
  return useQuery({
    // Bump key to invalidate any stale cache from prior implementations
    queryKey: ['producer-trends-ytd-v1', producerIds?.join(',') ?? 'all', fromDate, toDate],
    queryFn: async (): Promise<ProducerTrendsData> => {
      console.log('[YTD HOOK] Called with fromDate:', fromDate, 'toDate:', toDate)
      
      const { data, error } = await supabase.rpc('get_producer_trends' as any, {
        producer_ids: producerIds && producerIds.length ? producerIds : null,
        from_date: fromDate,
        to_date: toDate,
      })

      if (error) {
        console.error('❌ get_producer_trends RPC error:', error)
        throw error
      }

      const dailyRows: RpcDailyRow[] = Array.isArray(data) ? data : []

      // DEBUG: Log all daily rows for Maria
      const mariaRows = dailyRows.filter(r => r.producer_name?.toLowerCase().includes('maria'))
      console.log('[YTD] Maria daily rows count:', mariaRows.length)
      console.log('[YTD] Maria sold_households per day:', mariaRows.map(r => ({
        date: (r as any).entry_date,
        households: r.sold_households,
        items: r.sold_items
      })))

      // ✅ Aggregate per producer
      const byProducer = aggregateByProducer(dailyRows)

      // ✅ Team totals from aggregated rows
      const totals = byProducer.reduce(
        (acc, r) => {
          acc.items += r.items
          acc.households += r.households
          return acc
        },
        { items: 0, households: 0 }
      )

      // Always log aggregation results for debugging
      console.log('[YTD] Aggregated byProducer:', byProducer)
      console.log('[YTD] Computed totals:', totals)

      if (process.env.NODE_ENV !== 'production') {
        console.log('[YTD Debug] daily row count:', dailyRows.length)
        console.log('[YTD Debug] aggregated byProducer:', byProducer)
        console.log('[YTD Debug] totals:', totals)
      }

      // Freeze in dev to catch accidental mutation downstream
      if (process.env.NODE_ENV !== 'production') {
        Object.freeze(byProducer)
        Object.freeze(totals)
      }

      return { byProducer, totals }
    },
    enabled: !!fromDate && !!toDate,
  })
}

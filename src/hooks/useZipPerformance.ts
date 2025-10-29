import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface ZipPerformanceRow {
  zip_code: string
  quotes: number
  sales: number
  conversion_rate: number  // percentage
  premium: number
  items_sold: number
}

export interface ZipPerformanceSummary {
  total_unique_zips: number
  total_quotes: number
  total_sales: number
  top_zip: null | {
    zip_code: string
    quotes: number
    sales: number
    conversion_rate: number
    premium: number
    items_sold: number
  }
}

export interface ZipPerformanceData {
  rows: ZipPerformanceRow[]
  summary: ZipPerformanceSummary
}

export interface UseZipPerformanceParams {
  fromDate: string
  toDate: string
  producerId?: string | null
  sourceId?: string | null
  minQuotes?: number
  includeUnknown?: boolean
}

export function useZipPerformance(params: UseZipPerformanceParams) {
  const { 
    fromDate, 
    toDate, 
    producerId = null, 
    sourceId = null, 
    minQuotes = 1, 
    includeUnknown = false 
  } = params

  return useQuery({
    queryKey: ['zip-performance', fromDate, toDate, producerId, sourceId, minQuotes, includeUnknown],
    queryFn: async (): Promise<ZipPerformanceData> => {
      const payload = {
        p_date_start: fromDate,
        p_date_end: toDate,
        p_producer_id: producerId,
        p_source_id: sourceId,
        p_min_quotes: minQuotes,
        p_include_unknown: includeUnknown,
      }

      const { data, error } = await supabase.rpc('analytics_zip_performance_json' as any, payload)

      if (error) throw error

      const result = data as any
      const rows = (result?.rows as ZipPerformanceRow[]) || []
      const summary = (result?.summary as ZipPerformanceSummary) || {
        total_unique_zips: 0,
        total_quotes: 0,
        total_sales: 0,
        top_zip: null
      }

      return { rows, summary }
    },
    enabled: !!fromDate && !!toDate
  })
}

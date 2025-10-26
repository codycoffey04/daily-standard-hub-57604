// ./hooks/useAnalyticsData.ts
import { useQuery } from '@tanstack/react-query';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type ISODate = string;
export type YearMonth = string; // 'YYYY-MM'

// Generic month aggregate — if your analytics used custom table scans, push into RPCs
export interface MonthAggregate {
  qhh: number;
  quotes: number;
  sales: number;
  items: number;
  total_premium?: number | null;
}

/**
 * Analytics-wide "execution blocks" using the same funnel RPC,
 * but normalized into a simple aggregate structure some charts expect.
 */
export function useAnalyticsMonthExecution(
  month: YearMonth,
  producerId?: string | null,
  sourceId?: string | null
) {
  // Convert month -> range [first, last]
  const fromDate = `${month}-01`;
  // naive last day; back-end is robust, but be explicit if you have a util
  const toDate = getMonthEndISO(month);

  return useQuery<MonthAggregate, PostgrestError>({
    queryKey: ['analytics-month-execution', month, producerId ?? null, sourceId ?? null],
    enabled: Boolean(month),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_execution_funnel', {
        from_date: fromDate,
        to_date: toDate,
        producer_filter: normalizeId(producerId),
        source_filter: normalizeId(sourceId),
      });
      if (error) throw error;

      const stages = (data ?? []) as Array<{
        stage_name: string;
        stage_number: number;
        stage_value: number;
      }>;

      const by = (name: string) =>
        stages.find((s) => s.stage_name?.toLowerCase() === name)?.stage_value ??
        0;

      return {
        qhh: Number(by('qhh')),
        quotes: Number(by('quotes')),
        sales: Number(by('sales')),
        items: Number(by('items')),
      };
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export interface SourceBreakdown {
  source_name: string | null;
  qhh: number;
  quotes: number;
  items: number;
}

export function useAnalyticsSourceBreakdown(fromDate: ISODate, toDate: ISODate) {
  return useQuery<SourceBreakdown[], PostgrestError>({
    queryKey: ['analytics-source-breakdown', fromDate, toDate],
    enabled: Boolean(fromDate && toDate),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_items_by_source', {
        from_date: fromDate,
        to_date: toDate,
      });
      if (error) throw error;

      return (data ?? []).map((r: any) => ({
        source_name: r.source_name ?? null,
        qhh: Number(r.qhh ?? 0),
        quotes: Number(r.quotes ?? 0),
        items: Number(r.items ?? 0),
      }));
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

function normalizeId(id?: string | null) {
  if (!id) return null;
  const v = String(id).trim().toLowerCase();
  if (v === '' || v === 'all' || v === 'null' || v === 'undefined') return null;
  return id;
}

function getMonthEndISO(ym: YearMonth): ISODate {
  const [y, m] = ym.split('-').map((n) => Number(n));
  const last = new Date(Date.UTC(y, m, 0)); // day 0 of next month = last day of target
  const yyyy = last.getUTCFullYear();
  const mm = String(last.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(last.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default {
  useAnalyticsMonthExecution,
  useAnalyticsSourceBreakdown,
};

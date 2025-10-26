// ./hooks/useSummariesData.ts
import { useQuery } from '@tanstack/react-query';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type YearMonth = string; // 'YYYY-MM'
export type ISODate = string;

export interface MonthlySummary {
  total_qhh: number;
  total_quotes: number;
  total_dials: number;
  total_talk_time: number;
  avg_quotes_per_household: number;
}

export function useMonthlySummary(targetMonth: YearMonth, opts?: { enabled?: boolean }) {
  return useQuery<MonthlySummary, PostgrestError>({
    queryKey: ['monthly-summary', targetMonth],
    enabled: Boolean(targetMonth) && (opts?.enabled ?? true),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_summary', {
        target_month: targetMonth,
      });
      if (error) throw error;

      // Defensive numeric coercion:
      return {
        total_qhh: Number(data?.total_qhh ?? 0),
        total_quotes: Number(data?.total_quotes ?? 0),
        total_dials: Number(data?.total_dials ?? 0),
        total_talk_time: Number(data?.total_talk_time ?? 0),
        avg_quotes_per_household: Number(data?.avg_quotes_per_household ?? 0),
      };
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export interface ProducerMTDRow {
  producer_id: string;
  producer_name: string;
  qhh: number;
  quotes: number;
  items: number;
  sales: number;
  conversion: number; // backend-defined conversion metric
}

export function useMTDProducerMetrics(dateWithinMonth: ISODate, opts?: { enabled?: boolean }) {
  return useQuery<ProducerMTDRow[], PostgrestError>({
    queryKey: ['mtd-producer-metrics', dateWithinMonth],
    enabled: Boolean(dateWithinMonth) && (opts?.enabled ?? true),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('mtd_producer_metrics', {
        d: dateWithinMonth,
      });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        producer_id: String(r.producer_id),
        producer_name: String(r.producer_name),
        qhh: Number(r.qhh ?? 0),
        quotes: Number(r.quotes ?? 0),
        items: Number(r.items ?? 0),
        sales: Number(r.sales ?? 0),
        conversion: Number(r.conversion ?? 0),
      }));
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export interface SourceRollupRow {
  source_id: string | null;
  source_name: string | null;
  qhh: number;
  quotes: number;
  items: number;
  bundle_rate?: number | null;
  // any other ratios the RPC returns can be included here
}

/**
 * Single canonical RPC for both "QHH by Source" and "Items by Source".
 * Frontend can choose which metric to chart, but the **data foundation is identical**.
 */
export function useItemsAndQHHBySource(
  fromDate: ISODate,
  toDate: ISODate,
  opts?: { enabled?: boolean }
) {
  return useQuery<SourceRollupRow[], PostgrestError>({
    queryKey: ['items-qhh-by-source', fromDate, toDate],
    enabled: Boolean(fromDate && toDate) && (opts?.enabled ?? true),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_items_by_source', {
        from_date: fromDate,
        to_date: toDate,
      });
      if (error) throw error;

      return (data ?? []).map((r: any) => ({
        source_id: r.source_id ?? null,
        source_name: r.source_name ?? null,
        qhh: Number(r.qhh ?? 0),       // backend: COUNT(DISTINCT qh.lead_id)
        quotes: Number(r.quotes ?? 0), // backend-defined
        items: Number(r.items ?? 0),   // backend: SUM(items_sold)
        bundle_rate:
          r.bundle_rate === null || r.bundle_rate === undefined
            ? null
            : Number(r.bundle_rate),
      }));
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export type MetricType = 'qhh' | 'quotes' | 'items' | 'sales' | 'premium';

export interface TopSourcesRow {
  source_name: string;
  metric_value: number;
  percentage: number; // share of total for that month
}

export function useTopSourcesByMonth(
  monthYM: YearMonth,
  metricType: MetricType,
  limit: number,
  opts?: { enabled?: boolean }
) {
  return useQuery<TopSourcesRow[], PostgrestError>({
    queryKey: ['top-sources-by-month', monthYM, metricType, limit],
    enabled: Boolean(monthYM && metricType && limit) && (opts?.enabled ?? true),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_get_top_sources_by_month', {
        month_ym: monthYM,
        metric_type: metricType,
        lim: limit,
      });
      if (error) throw error;

      return (data ?? []).map((r: any) => ({
        source_name: String(r.source_name),
        metric_value: Number(r.metric_value ?? 0),
        percentage: Number(r.percentage ?? 0),
      }));
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

// Optional default export for compatibility with places that do `import * as useSummariesData`
export default {
  useMonthlySummary,
  useMTDProducerMetrics,
  useItemsAndQHHBySource,
  useTopSourcesByMonth,
};

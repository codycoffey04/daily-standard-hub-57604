// ./hooks/useExecutionFunnel.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UUID = string;
export type ISODate = string; // 'YYYY-MM-DD'

export interface ExecutionFunnelRow {
  stage_number: number;
  stage_name: string; // expected: 'QHH' | 'Quotes' | 'Sales' | 'Items'
  stage_value: number; // aggregated count
  conversion_rate: number | null;
  drop_off_count: number | null;
  drop_off_rate: number | null;
}

export interface ExecutionFunnelData {
  stages: ExecutionFunnelRow[];
  totals: {
    qhh_total: number;
    quotes_total: number;
    sales_total: number;
    items_total: number;
  };
  byName: Record<string, ExecutionFunnelRow | undefined>;
}

type ArgsObject = {
  fromDate: ISODate;
  toDate: ISODate;
  producerId?: UUID | null;
  sourceId?: UUID | null;
};

type PositionalOverload = (
  fromDate: ISODate,
  toDate: ISODate,
  producerId?: UUID | null,
  sourceId?: UUID | null,
  options?: Partial<UseQueryOptions<ExecutionFunnelData, PostgrestError>>
) => ReturnType<typeof useQuery<ExecutionFunnelData, PostgrestError>>;

/**
 * Flexible signature: supports both object and positional params to preserve existing call sites.
 */
export function useExecutionFunnel(
  argsOrFrom: ArgsObject | ISODate,
  maybeToDate?: ISODate,
  maybeProducerId?: UUID | null,
  maybeSourceId?: UUID | null,
  maybeOptions?: Partial<UseQueryOptions<ExecutionFunnelData, PostgrestError>>
) {
  const args: ArgsObject =
    typeof argsOrFrom === 'string'
      ? {
          fromDate: argsOrFrom,
          toDate: maybeToDate as ISODate,
          producerId: normalizeId(maybeProducerId),
          sourceId: normalizeId(maybeSourceId),
        }
      : {
          fromDate: argsOrFrom.fromDate,
          toDate: argsOrFrom.toDate,
          producerId: normalizeId(argsOrFrom.producerId),
          sourceId: normalizeId(argsOrFrom.sourceId),
        };

  const { fromDate, toDate, producerId, sourceId } = args;

  return useQuery<ExecutionFunnelData, PostgrestError>({
    queryKey: [
      'execution-funnel',
      fromDate,
      toDate,
      producerId ?? null,
      sourceId ?? null,
    ],
    queryFn: async () => {
      // Single source of truth: RPC (backend handles filters & logic)
      const { data, error } = await supabase.rpc('get_execution_funnel', {
        from_date: fromDate,
        to_date: toDate,
        producer_filter: producerId ?? null,
        source_filter: sourceId ?? null,
      });

      if (error) {
        // Surface full stack context to React Query error boundary / logger
        throw error;
      }

      const stages: ExecutionFunnelRow[] = (data ?? []).map((r: any) => ({
        stage_number: Number(r.stage_number),
        stage_name: String(r.stage_name),
        stage_value: Number(r.stage_value ?? 0),
        conversion_rate:
          r.conversion_rate === null || r.conversion_rate === undefined
            ? null
            : Number(r.conversion_rate),
        drop_off_count:
          r.drop_off_count === null || r.drop_off_count === undefined
            ? null
            : Number(r.drop_off_count),
        drop_off_rate:
          r.drop_off_rate === null || r.drop_off_rate === undefined
            ? null
            : Number(r.drop_off_rate),
      }));

      // Fast index by name (case‑insensitive)
      const byName: Record<string, ExecutionFunnelRow | undefined> = {};
      for (const s of stages) {
        byName[s.stage_name.toLowerCase()] = s;
      }

      const totals = {
        qhh_total: byName['qhh']?.stage_value ?? findByNumber(stages, 1) ?? 0,
        quotes_total:
          byName['quotes']?.stage_value ?? findByNumber(stages, 2) ?? 0,
        sales_total:
          byName['sales']?.stage_value ?? findByNumber(stages, 3) ?? 0,
        items_total:
          byName['items']?.stage_value ?? findByNumber(stages, 4) ?? 0,
      };

      return { stages, totals, byName };
    },
    enabled: Boolean(fromDate && toDate),
    // Caching discipline: ensure fresh, avoid stale cross‑filter reuse.
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
    ...maybeOptions,
  });
}

function normalizeId(id?: string | null) {
  if (!id) return null;
  const v = String(id).trim().toLowerCase();
  if (v === '' || v === 'all' || v === 'null' || v === 'undefined') return null;
  return id;
}

function findByNumber(stages: ExecutionFunnelRow[], stageNum: number) {
  return stages.find((s) => s.stage_number === stageNum)?.stage_value ?? 0;
}

// Re-export types for compatibility
export interface ExecutionFunnelStage extends ExecutionFunnelRow {}
export interface ExecutionBenchmark {
  source_id: string
  source_name: string
  total_producers: number
  quote_rate_normal: number
  quote_rate_excellent: number
  close_rate_normal: number
  close_rate_excellent: number
  attach_rate_normal: number
  attach_rate_excellent: number
}

export interface ExecutionEfficiency {
  metric_name: string
  metric_value: number
  metric_unit: string
}

export interface ProducerLeaderboard {
  producer_id: string
  producer_name: string
  total_dials: number | null
  total_qhh: number | null
  quote_rate: number | null
  quote_guidance: 'above_excellent' | 'normal_range' | 'needs_attention' | 'insufficient_volume' | 'no_benchmark'
  total_shh: number | null
  close_rate: number | null
  close_guidance: 'above_excellent' | 'normal_range' | 'needs_attention' | 'insufficient_volume' | 'no_benchmark'
  total_items: number | null
  attach_rate: number | null
  attach_guidance: 'above_excellent' | 'normal_range' | 'needs_attention' | 'insufficient_volume' | 'no_benchmark'
  total_premium: number | null
}

// Legacy hook exports for backward compatibility
export const useExecutionBenchmarks = (
  fromDate: string,
  toDate: string,
  minPairQHH: number = 10,
  minPairSHH: number = 0,
  minPairDials: number = 100
) => {
  return useQuery({
    queryKey: ['execution-benchmarks-unified', fromDate, toDate, minPairQHH, minPairSHH, minPairDials],
    queryFn: async (): Promise<ExecutionBenchmark[]> => {
      const monthYm = toDate.substring(0, 7)
      const { data, error } = await supabase.rpc('rpc_get_execution_benchmarks_by_source' as any, {
        month_ym: monthYm,
        source_filter: null,
        min_pair_qhh: minPairQHH,
        min_pair_shh: minPairSHH,
        min_pair_dials: minPairDials
      });

      if (error) throw error;
      return (data as any[] || []).map((row: any) => ({
        source_id: row.source_id,
        source_name: row.source_name,
        total_producers: parseInt(row.total_producers) || 0,
        quote_rate_normal: parseFloat(row.quote_rate_normal || row.quote_bench_normal || row.normal_quote_rate) || 0,
        quote_rate_excellent: parseFloat(row.quote_rate_excellent || row.quote_bench_excellent || row.excellent_quote_rate) || 0,
        close_rate_normal: parseFloat(row.close_rate_normal || row.close_bench_normal || row.normal_close_rate) || 0,
        close_rate_excellent: parseFloat(row.close_rate_excellent || row.close_bench_excellent || row.excellent_close_rate) || 0,
        attach_rate_normal: parseFloat(row.attach_rate_normal || row.attach_bench_normal || row.normal_attach_rate) || 0,
        attach_rate_excellent: parseFloat(row.attach_rate_excellent || row.attach_bench_excellent || row.excellent_attach_rate) || 0,
      }));
    },
    enabled: !!fromDate && !!toDate
  })
}

export const useProducersForExecution = () => {
  return useQuery({
    queryKey: ['producers-for-execution-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producers')
        .select('id, display_name')
        .eq('active', true)
        .order('display_name')

      if (error) throw error
      return data || []
    }
  })
}

export default useExecutionFunnel;
export type { PositionalOverload as UseExecutionFunnelPositional };

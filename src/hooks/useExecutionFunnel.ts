import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

// ===== Types =====

export interface ExecutionFunnelStage {
  stage_number: number
  stage_name: string
  stage_value: number
  conversion_rate: number
  drop_off_count: number
  drop_off_rate: number
}

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

// ===== Hook 1: Execution Funnel =====

export const useExecutionFunnel = (
  fromDate: string,
  toDate: string,
  producerId: string | null = null,
  sourceId: string | null = null
) => {
  return useQuery({
    queryKey: ['execution-funnel', fromDate, toDate, producerId, sourceId],
    queryFn: async (): Promise<ExecutionFunnelStage[]> => {
      console.log('📊 Fetching execution funnel via RPC...', { fromDate, toDate, producerId, sourceId });

      const { data, error } = await supabase.rpc('get_execution_funnel' as any, {
        from_date: fromDate,
        to_date: toDate,
        producer_filter: producerId,
        source_filter: sourceId
      });

      if (error) {
        console.error('❌ Error fetching execution funnel:', error);
        throw error;
      }

      console.log('✅ Execution funnel RPC returned:', data);

      if (!data || data.length === 0) {
        return [
          { stage_number: 1, stage_name: 'Dials', stage_value: 0, conversion_rate: 100, drop_off_count: 0, drop_off_rate: 0 },
          { stage_number: 2, stage_name: 'QHH', stage_value: 0, conversion_rate: 0, drop_off_count: 0, drop_off_rate: 0 },
          { stage_number: 3, stage_name: 'Sales', stage_value: 0, conversion_rate: 0, drop_off_count: 0, drop_off_rate: 0 },
          { stage_number: 4, stage_name: 'Items Sold', stage_value: 0, conversion_rate: 0, drop_off_count: 0, drop_off_rate: 0 },
          { stage_number: 5, stage_name: 'Premium', stage_value: 0, conversion_rate: 0, drop_off_count: 0, drop_off_rate: 0 },
        ];
      }

      // Transform RPC response to ExecutionFunnelStage interface
      // RPC returns: { stage: text, value: bigint, conversion_rate: numeric }
      const stages: ExecutionFunnelStage[] = (data as any[]).map((row, index) => ({
        stage_number: index + 1,
        stage_name: row.stage,
        stage_value: Number(row.value || 0),
        conversion_rate: Number(row.conversion_rate || 0),
        drop_off_count: 0,
        drop_off_rate: 0
      }));

      // Calculate drop-offs between stages
      for (let i = 1; i < stages.length; i++) {
        const prevValue = stages[i - 1].stage_value;
        const currValue = stages[i].stage_value;
        stages[i].drop_off_count = Math.max(0, prevValue - currValue);
        stages[i].drop_off_rate = prevValue > 0 
          ? ((prevValue - currValue) / prevValue) * 100 
          : 0;
      }

      console.log('📊 Final funnel stages:', stages);
      return stages;
    },
    enabled: !!fromDate && !!toDate,
    staleTime: 0,  // Always refetch
    gcTime: 0      // Clear from cache immediately
  })
}

// ===== Hook 2: Execution Benchmarks =====

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
      // Use toDate for month_ym (represents the period being analyzed)
      const monthYm = toDate.substring(0, 7) // '2025-10-25' -> '2025-10'

      console.log('📊 === EXECUTION BENCHMARKS RPC CALL (UNIFIED) ===')
      console.log('  Date range - from:', fromDate, 'to:', toDate)
      console.log('  Using month_ym:', monthYm)
      console.log('  Thresholds:', { minPairQHH, minPairSHH, minPairDials })
      console.log('  source_filter: null (ALL SOURCES)')

      // Make ONE RPC call for ALL sources
      const { data: benchmarkData, error: benchmarkError } = await supabase
        .rpc('rpc_get_execution_benchmarks_by_source' as any, {
          month_ym: monthYm,
          source_filter: null,  // ← NULL to get all sources at once
          min_pair_qhh: minPairQHH,
          min_pair_shh: minPairSHH,
          min_pair_dials: minPairDials
        });

      if (benchmarkError) {
        console.error('❌ Error fetching benchmarks:', benchmarkError);
        throw benchmarkError;
      }

      if (!benchmarkData || (benchmarkData as any[]).length === 0) {
        console.log('ℹ️ No benchmark data returned (insufficient volume or no data)');
        return [];
      }

      // Transform the data to match ExecutionBenchmark interface
      const benchmarks: ExecutionBenchmark[] = (benchmarkData as any[]).map((row, index) => {
        // Debug: log the first row to see actual field names
        if (index === 0) {
          console.log('🔍 First benchmark row structure:', row);
          console.log('🔍 Available fields:', Object.keys(row));
        }
        
        return {
          source_id: row.source_id,
          source_name: row.source_name,
          total_producers: parseInt(row.total_producers) || 0,
          // Try multiple possible field name patterns
          quote_rate_normal: parseFloat(row.quote_rate_normal || row.quote_bench_normal || row.normal_quote_rate) || 0,
          quote_rate_excellent: parseFloat(row.quote_rate_excellent || row.quote_bench_excellent || row.excellent_quote_rate) || 0,
          close_rate_normal: parseFloat(row.close_rate_normal || row.close_bench_normal || row.normal_close_rate) || 0,
          close_rate_excellent: parseFloat(row.close_rate_excellent || row.close_bench_excellent || row.excellent_close_rate) || 0,
          attach_rate_normal: parseFloat(row.attach_rate_normal || row.attach_bench_normal || row.normal_attach_rate) || 0,
          attach_rate_excellent: parseFloat(row.attach_rate_excellent || row.attach_bench_excellent || row.excellent_attach_rate) || 0,
        };
      });

      console.log('✅ Fetched benchmarks for', benchmarks.length, 'sources in ONE call');
      console.log('📊 Sample benchmark values:', benchmarks[0]);
      console.log('Sources:', benchmarks.map(b => b.source_name).join(', '));
      
      return benchmarks;
    },
    enabled: !!fromDate && !!toDate
  })
}

// ===== Hook 3: Execution Efficiency =====

export const useExecutionEfficiency = (
  fromDate: string,
  toDate: string,
  producerId: string | null = null,
  sourceId: string | null = null,
  commissionPct: number = 0.12
) => {
  return useQuery({
    queryKey: ['execution-efficiency', fromDate, toDate, producerId, sourceId, commissionPct],
    queryFn: async (): Promise<ExecutionEfficiency[]> => {
      console.log('📊 Fetching execution efficiency (using funnel RPC for base data)...');

      // Reuse the funnel RPC to get base totals
      const { data: funnelData, error: funnelError } = await supabase.rpc('get_execution_funnel' as any, {
        from_date: fromDate,
        to_date: toDate,
        producer_filter: producerId,
        source_filter: sourceId
      });

      if (funnelError) {
        console.error('❌ Error fetching efficiency data:', funnelError);
        throw funnelError;
      }

      if (!funnelData || funnelData.length === 0) {
        return [
          { metric_name: 'Total Dials', metric_value: 0, metric_unit: 'dials' },
          { metric_name: 'Total QHH', metric_value: 0, metric_unit: 'households' },
          { metric_name: 'Total Sales', metric_value: 0, metric_unit: 'sales' },
          { metric_name: 'Total Items', metric_value: 0, metric_unit: 'items' },
          { metric_name: 'Total Premium', metric_value: 0, metric_unit: 'dollars' },
          { metric_name: 'Premium per Dial', metric_value: 0, metric_unit: '$/dial' },
          { metric_name: 'Commission per Dial', metric_value: 0, metric_unit: '$/dial' },
          { metric_name: 'Items per Sale', metric_value: 0, metric_unit: 'items/sale' },
          { metric_name: 'Premium per Item', metric_value: 0, metric_unit: '$/item' },
        ];
      }

      // Extract totals from funnel stages
      const stageMap = new Map((funnelData as any[]).map(s => [s.stage, Number(s.value || 0)]));
      const totalDials = stageMap.get('Dials') || 0;
      const totalQHH = stageMap.get('QHH') || 0;
      const totalSales = stageMap.get('Sales') || 0;
      const totalItems = stageMap.get('Items Sold') || 0;
      const totalPremium = stageMap.get('Premium') || 0;

      // Calculate efficiency metrics
      const metrics: ExecutionEfficiency[] = [
        { metric_name: 'Total Dials', metric_value: totalDials, metric_unit: 'dials' },
        { metric_name: 'Total QHH', metric_value: totalQHH, metric_unit: 'households' },
        { metric_name: 'Total Sales', metric_value: totalSales, metric_unit: 'sales' },
        { metric_name: 'Total Items', metric_value: totalItems, metric_unit: 'items' },
        { metric_name: 'Total Premium', metric_value: Math.round(totalPremium), metric_unit: 'dollars' },
        { 
          metric_name: 'Premium per Dial',
          metric_value: totalDials > 0 ? Math.round((totalPremium / totalDials) * 100) / 100 : 0, 
          metric_unit: '$/dial' 
        },
        { 
          metric_name: 'Commission per Dial', 
          metric_value: totalDials > 0 ? Math.round((totalPremium * commissionPct / totalDials) * 100) / 100 : 0, 
          metric_unit: '$/dial' 
        },
        { 
          metric_name: 'Items per Sale', 
          metric_value: totalSales > 0 ? Math.round((totalItems / totalSales) * 100) / 100 : 0, 
          metric_unit: 'items/sale' 
        },
        { 
          metric_name: 'Premium per Item', 
          metric_value: totalItems > 0 ? Math.round(totalPremium / totalItems) : 0, 
          metric_unit: '$/item' 
        },
      ];

      console.log('✅ Efficiency metrics calculated:', metrics);
      return metrics;
    },
    enabled: !!fromDate && !!toDate,
    staleTime: 0,
    gcTime: 0
  })
}

// ===== Hook 4: Producers for Filter =====

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

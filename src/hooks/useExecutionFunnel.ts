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
      // Choose table based on filters
      const tableName = sourceId ? 'producer_day_source_rollup' : 'producer_day_rollup';
      
      let query = supabase
        .from(tableName as any)
        .select('dials, qhh, shh, items, policies_sold, written_premium')
        .gte('entry_date', fromDate)
        .lte('entry_date', toDate);

      if (producerId) query = query.eq('producer_id', producerId);
      if (sourceId && tableName === 'producer_day_source_rollup') {
        query = query.eq('source_id', sourceId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching execution funnel:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [
          { stage_number: 1, stage_name: 'Dials', stage_value: 0, conversion_rate: 100, drop_off_count: 0, drop_off_rate: 0 },
          { stage_number: 2, stage_name: 'QHH', stage_value: 0, conversion_rate: 0, drop_off_count: 0, drop_off_rate: 0 },
          { stage_number: 3, stage_name: 'SHH', stage_value: 0, conversion_rate: 0, drop_off_count: 0, drop_off_rate: 0 },
          { stage_number: 4, stage_name: 'Policies', stage_value: 0, conversion_rate: 0, drop_off_count: 0, drop_off_rate: 0 },
          { stage_number: 5, stage_name: 'Premium', stage_value: 0, conversion_rate: 0, drop_off_count: 0, drop_off_rate: 0 },
        ];
      }

      // Aggregate totals
      const totalDials = (data as any[]).reduce((sum, row) => sum + (Number(row.dials) || 0), 0);
      const totalQHH = (data as any[]).reduce((sum, row) => sum + (Number(row.qhh) || 0), 0);
      const totalSHH = (data as any[]).reduce((sum, row) => sum + (Number(row.shh) || 0), 0);
      const totalPolicies = (data as any[]).reduce((sum, row) => sum + (Number(row.policies_sold) || 0), 0);
      const totalPremium = (data as any[]).reduce((sum, row) => sum + (Number(row.written_premium) || 0), 0);

      // Build funnel stages
      const stages: ExecutionFunnelStage[] = [
        {
          stage_number: 1,
          stage_name: 'Dials',
          stage_value: totalDials,
          conversion_rate: 100,
          drop_off_count: 0,
          drop_off_rate: 0
        },
        {
          stage_number: 2,
          stage_name: 'QHH',
          stage_value: totalQHH,
          conversion_rate: totalDials > 0 ? (totalQHH / totalDials) * 100 : 0,
          drop_off_count: totalDials - totalQHH,
          drop_off_rate: totalDials > 0 ? ((totalDials - totalQHH) / totalDials) * 100 : 0
        },
        {
          stage_number: 3,
          stage_name: 'SHH',
          stage_value: totalSHH,
          conversion_rate: totalQHH > 0 ? (totalSHH / totalQHH) * 100 : 0,
          drop_off_count: totalQHH - totalSHH,
          drop_off_rate: totalQHH > 0 ? ((totalQHH - totalSHH) / totalQHH) * 100 : 0
        },
        {
          stage_number: 4,
          stage_name: 'Policies',
          stage_value: totalPolicies,
          conversion_rate: totalSHH > 0 ? (totalPolicies / totalSHH) * 100 : 0,
          drop_off_count: totalSHH - totalPolicies,
          drop_off_rate: totalSHH > 0 ? ((totalSHH - totalPolicies) / totalSHH) * 100 : 0
        },
        {
          stage_number: 5,
          stage_name: 'Premium',
          stage_value: Math.round(totalPremium),
          conversion_rate: totalPolicies > 0 ? (totalPremium / totalPolicies) : 0,
          drop_off_count: 0,
          drop_off_rate: 0
        }
      ];

      return stages;
    },
    enabled: !!fromDate && !!toDate
  })
}

// ===== Hook 2: Execution Benchmarks =====

export const useExecutionBenchmarks = (
  fromDate: string,
  toDate: string,
  minPairQHH: number = 1,
  minPairSHH: number = 0,
  minPairDials: number = 0
) => {
  return useQuery({
    queryKey: ['execution-benchmarks-v2', fromDate, toDate, minPairQHH, minPairSHH, minPairDials],
    queryFn: async (): Promise<ExecutionBenchmark[]> => {
      // Extract month_ym from fromDate (format: YYYY-MM-DD -> YYYY-MM)
      const monthYm = fromDate.substring(0, 7) // '2025-10-15' -> '2025-10'

      console.log('📊 === EXECUTION BENCHMARKS RPC CALL (NEW) ===')
      console.log('  Original dates - from:', fromDate, 'to:', toDate)
      console.log('  Extracted month_ym:', monthYm)

      // Fetch all source IDs that have data
      const { data: rollupData, error: rollupError } = await supabase
        .from('producer_day_source_rollup' as any)
        .select('source_id, producer_id')
        .gte('entry_date', fromDate)
        .lte('entry_date', toDate);

      if (rollupError) {
        console.error('❌ Error fetching source rollup:', rollupError);
        throw rollupError;
      }

      if (!rollupData || rollupData.length === 0) return [];

      // Fetch source names
      const { data: sources, error: sourcesError } = await supabase
        .from('sources')
        .select('id, name');

      if (sourcesError) {
        console.error('❌ Error fetching sources:', sourcesError);
        throw sourcesError;
      }

      const sourceMap = new Map(sources?.map(s => [s.id, s.name]) || []);

      // Group by source to get unique sources with producer counts
      const sourceGroups: Record<string, Set<string>> = {};
      rollupData.forEach((row: any) => {
        if (!sourceGroups[row.source_id]) {
          sourceGroups[row.source_id] = new Set();
        }
        sourceGroups[row.source_id].add(row.producer_id);
      });

      // Calculate dynamic benchmarks for each source
      const benchmarks: ExecutionBenchmark[] = [];

      for (const [sourceId, producerSet] of Object.entries(sourceGroups)) {
        console.log('  Processing source:', sourceId, 'with', producerSet.size, 'producers')
        console.log('  RPC params:', JSON.stringify({
          month_ym: monthYm,
          source_filter: sourceId,
          min_pair_qhh: minPairQHH,
          min_pair_shh: minPairSHH,
          min_pair_dials: minPairDials
        }, null, 2))

        // Call the NEW database function with month_ym
        const { data: benchmarkData, error: benchmarkError } = await supabase
          .rpc('rpc_get_execution_benchmarks_by_source' as any, {
            month_ym: monthYm,
            source_filter: sourceId,
            min_pair_qhh: minPairQHH,
            min_pair_shh: minPairSHH,
            min_pair_dials: minPairDials
          });

        if (benchmarkError) {
          console.error(`❌ Error fetching benchmarks for source ${sourceId}:`, benchmarkError);
          continue;
        }

        // If no benchmark data (insufficient volume), skip this source
        if (!benchmarkData || (benchmarkData as any[]).length === 0) {
          console.log(`ℹ️ Insufficient data for source ${sourceId} (${sourceMap.get(sourceId)})`);
          continue;
        }

        const benchmark = (benchmarkData as any[])[0];
        const sourceName = sourceMap.get(sourceId) || 'Unknown';

        benchmarks.push({
          source_id: sourceId,
          source_name: sourceName,
          total_producers: producerSet.size,
          quote_rate_normal: Number(benchmark.quote_bench_normal) || 0,
          quote_rate_excellent: Number(benchmark.quote_bench_excellent) || 0,
          close_rate_normal: Number(benchmark.close_bench_normal) || 0,
          close_rate_excellent: Number(benchmark.close_bench_excellent) || 0,
          attach_rate_normal: Number(benchmark.attach_bench_normal) || 0,
          attach_rate_excellent: Number(benchmark.attach_bench_excellent) || 0,
        });
      }

      console.log('✅ Fetched benchmarks for', benchmarks.length, 'sources')
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
      // Choose table based on filters
      const tableName = sourceId ? 'producer_day_source_rollup' : 'producer_day_rollup';
      
      let query = supabase
        .from(tableName as any)
        .select('dials, qhh, shh, items, policies_sold, written_premium')
        .gte('entry_date', fromDate)
        .lte('entry_date', toDate);

      if (producerId) query = query.eq('producer_id', producerId);
      if (sourceId && tableName === 'producer_day_source_rollup') {
        query = query.eq('source_id', sourceId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching efficiency:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [
          { metric_name: 'Total Dials', metric_value: 0, metric_unit: 'dials' },
          { metric_name: 'Total QHH', metric_value: 0, metric_unit: 'households' },
          { metric_name: 'Total SHH', metric_value: 0, metric_unit: 'households' },
          { metric_name: 'Total Policies', metric_value: 0, metric_unit: 'policies' },
          { metric_name: 'Total Premium', metric_value: 0, metric_unit: 'dollars' },
        ];
      }

      // Aggregate totals
      const totalDials = (data as any[]).reduce((sum, row) => sum + (Number(row.dials) || 0), 0);
      const totalQHH = (data as any[]).reduce((sum, row) => sum + (Number(row.qhh) || 0), 0);
      const totalSHH = (data as any[]).reduce((sum, row) => sum + (Number(row.shh) || 0), 0);
      const totalPolicies = (data as any[]).reduce((sum, row) => sum + (Number(row.policies_sold) || 0), 0);
      const totalPremium = (data as any[]).reduce((sum, row) => sum + (Number(row.written_premium) || 0), 0);

      // Calculate efficiency metrics
      const metrics: ExecutionEfficiency[] = [
        { metric_name: 'Total Dials', metric_value: totalDials, metric_unit: 'dials' },
        { metric_name: 'Total QHH', metric_value: totalQHH, metric_unit: 'households' },
        { metric_name: 'Total SHH', metric_value: totalSHH, metric_unit: 'households' },
        { metric_name: 'Total Policies', metric_value: totalPolicies, metric_unit: 'policies' },
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
          metric_name: 'Policies per SHH', 
          metric_value: totalSHH > 0 ? Math.round((totalPolicies / totalSHH) * 100) / 100 : 0, 
          metric_unit: 'policies/household' 
        },
        { 
          metric_name: 'Premium per Policy', 
          metric_value: totalPolicies > 0 ? Math.round(totalPremium / totalPolicies) : 0, 
          metric_unit: '$/policy' 
        },
      ];

      return metrics;
    },
    enabled: !!fromDate && !!toDate
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

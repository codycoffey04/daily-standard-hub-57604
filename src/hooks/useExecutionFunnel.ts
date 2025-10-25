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

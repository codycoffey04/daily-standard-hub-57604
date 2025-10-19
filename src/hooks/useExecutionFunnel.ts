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
  minPairSHH: number = 5,
  minPairDials: number = 100
) => {
  return useQuery({
    queryKey: ['execution-benchmarks', fromDate, toDate, minPairQHH, minPairSHH, minPairDials],
    queryFn: async (): Promise<ExecutionBenchmark[]> => {
      // Fetch rollup data without join
      const { data: rollupData, error: rollupError } = await supabase
        .from('producer_day_source_rollup' as any)
        .select('source_id, producer_id, qhh, shh, items, policies_sold, written_premium')
        .gte('entry_date', fromDate)
        .lte('entry_date', toDate);

      if (rollupError) {
        console.error('❌ Error fetching benchmarks rollup:', rollupError);
        throw rollupError;
      }

      if (!rollupData || rollupData.length === 0) return [];

      // Fetch sources separately
      const { data: sources, error: sourcesError } = await supabase
        .from('sources')
        .select('id, name');

      if (sourcesError) {
        console.error('❌ Error fetching sources:', sourcesError);
      }

      // Create lookup map for fast joins
      const sourceMap = new Map(
        sources?.map(s => [s.id, s.name]) || []
      );

      // Group by source_id
      const sourceGroups: Record<string, any[]> = {};
      
      rollupData.forEach((row: any) => {
        const sourceId = row.source_id;
        if (!sourceGroups[sourceId]) {
          sourceGroups[sourceId] = [];
        }
        sourceGroups[sourceId].push(row);
      });

      // Hardcoded realistic industry benchmarks by source type
      const SOURCE_BENCHMARKS: Record<string, {
        quote_rate_normal: number;
        quote_rate_excellent: number;
        close_rate_normal: number;
        close_rate_excellent: number;
        attach_rate_normal: number;
        attach_rate_excellent: number;
      }> = {
        'Net Lead': {
          quote_rate_normal: 12,
          quote_rate_excellent: 18,
          close_rate_normal: 25,
          close_rate_excellent: 35,
          attach_rate_normal: 1.3,
          attach_rate_excellent: 1.5
        },
        'Digital Marketing': {
          quote_rate_normal: 65,
          quote_rate_excellent: 75,
          close_rate_normal: 20,
          close_rate_excellent: 30,
          attach_rate_normal: 1.2,
          attach_rate_excellent: 1.4
        },
        'Customer Referral': {
          quote_rate_normal: 100,
          quote_rate_excellent: 100,
          close_rate_normal: 60,
          close_rate_excellent: 75,
          attach_rate_normal: 1.4,
          attach_rate_excellent: 1.6
        },
        'Direct Mail': {
          quote_rate_normal: 70,
          quote_rate_excellent: 80,
          close_rate_normal: 15,
          close_rate_excellent: 25,
          attach_rate_normal: 1.1,
          attach_rate_excellent: 1.3
        },
        'CLICK AD': {
          quote_rate_normal: 50,
          quote_rate_excellent: 65,
          close_rate_normal: 18,
          close_rate_excellent: 28,
          attach_rate_normal: 1.2,
          attach_rate_excellent: 1.4
        }
      };

      // Calculate benchmarks for each source
      const benchmarks: ExecutionBenchmark[] = [];

      Object.entries(sourceGroups).forEach(([sourceId, rows]) => {
        const sourceName = sourceMap.get(sourceId) || 'Unknown';
        
        // Count unique producers for this source
        const uniqueProducers = new Set(rows.map((row: any) => row.producer_id));
        const producerCount = uniqueProducers.size;
        
        // Get benchmarks for this source, or use default fallback
        const sourceBenchmarks = SOURCE_BENCHMARKS[sourceName] || {
          quote_rate_normal: 50,
          quote_rate_excellent: 65,
          close_rate_normal: 20,
          close_rate_excellent: 30,
          attach_rate_normal: 1.2,
          attach_rate_excellent: 1.4
        };
        
        benchmarks.push({
          source_id: sourceId,
          source_name: sourceName,
          total_producers: producerCount,
          ...sourceBenchmarks
        });
      });

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

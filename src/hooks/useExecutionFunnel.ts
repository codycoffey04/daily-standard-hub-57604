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
  total_pairs: number
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
      console.log('📊 Fetching execution funnel:', { fromDate, toDate, producerId, sourceId })

      const { data, error } = await supabase.rpc('get_execution_funnel' as any, {
        from_date: fromDate,
        to_date: toDate,
        producer_filter: producerId,
        source_filter: sourceId
      })

      if (error) {
        console.error('❌ Error fetching execution funnel:', error)
        throw error
      }

      console.log('✅ Execution funnel data:', data)
      return (data as unknown as ExecutionFunnelStage[]) || []
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
      console.log('📈 Fetching execution benchmarks')

      const { data, error } = await supabase.rpc('get_execution_benchmarks_by_source' as any, {
        from_date: fromDate,
        to_date: toDate,
        min_pair_qhh: minPairQHH,
        min_pair_shh: minPairSHH,
        min_pair_dials: minPairDials
      })

      if (error) {
        console.error('❌ Error fetching benchmarks:', error)
        throw error
      }

      console.log('✅ Benchmarks data:', data)
      return (data as unknown as ExecutionBenchmark[]) || []
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
      console.log('💰 Fetching execution efficiency')

      const { data, error } = await supabase.rpc('get_execution_efficiency_metrics' as any, {
        from_date: fromDate,
        to_date: toDate,
        producer_filter: producerId,
        source_filter: sourceId,
        commission_pct: commissionPct
      })

      if (error) {
        console.error('❌ Error fetching efficiency:', error)
        throw error
      }

      console.log('✅ Efficiency data:', data)
      return (data as unknown as ExecutionEfficiency[]) || []
    },
    enabled: !!fromDate && !!toDate
  })
}

// ===== Hook 4: Producer Leaderboard =====

export const useProducerLeaderboard = (
  fromDate: string,
  toDate: string,
  sourceId: string | null = null,
  minDials: number = 50,
  minQHH: number = 5,
  minSHH: number = 2
) => {
  return useQuery({
    queryKey: ['producer-leaderboard', fromDate, toDate, sourceId, minDials, minQHH, minSHH],
    queryFn: async (): Promise<ProducerLeaderboard[]> => {
      console.log('🏆 Fetching producer leaderboard')

      const { data, error } = await supabase.rpc('get_producer_execution_leaderboard' as any, {
        from_date: fromDate,
        to_date: toDate,
        source_filter: sourceId,
        min_dials: minDials,
        min_qhh: minQHH,
        min_shh: minSHH,
        min_pair_qhh: 10,
        min_pair_shh: 5,
        min_pair_dials: 100
      })

      if (error) {
        console.error('❌ Error fetching leaderboard:', error)
        throw error
      }

      console.log('✅ Leaderboard data:', data)
      return (data as unknown as ProducerLeaderboard[]) || []
    },
    enabled: !!fromDate && !!toDate
  })
}

// ===== Hook 5: Producers for Filter =====

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

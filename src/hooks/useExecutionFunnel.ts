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

export interface ExecutionFunnelData {
  stages: ExecutionFunnelStage[]
  qhh?: number
}

export interface ExecutionBenchmark {
  sourceId: string
  sourceName: string
  totalPairs: number
  quoteRateNormal: number
  quoteRateExcellent: number
  closeRateNormal: number
  closeRateExcellent: number
  attachRateNormal: number
  attachRateExcellent: number
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
  toDate: string
) => {
  return useQuery({
    queryKey: ['execution-funnel-v2', fromDate, toDate],
    queryFn: async (): Promise<ExecutionFunnelData> => {
      const { data, error } = await supabase.rpc('get_execution_funnel' as any, {
        from_date: fromDate,
        to_date: toDate
      })

      if (error) {
        console.error('❌ Error fetching execution funnel via RPC:', error)
        throw error
      }

      // Handle empty response
      if (!data || data.length === 0) {
        return { 
          stages: [
            { stage_number: 1, stage_name: 'Dials', stage_value: 0, conversion_rate: 100, drop_off_count: 0, drop_off_rate: 0 },
            { stage_number: 2, stage_name: 'QHH', stage_value: 0, conversion_rate: 0, drop_off_count: 0, drop_off_rate: 0 },
            { stage_number: 3, stage_name: 'Sales', stage_value: 0, conversion_rate: 0, drop_off_count: 0, drop_off_rate: 0 },
            { stage_number: 4, stage_name: 'Items', stage_value: 0, conversion_rate: 0, drop_off_count: 0, drop_off_rate: 0 },
            { stage_number: 5, stage_name: 'Premium', stage_value: 0, conversion_rate: 0, drop_off_count: 0, drop_off_rate: 0 }
          ],
          qhh: 0 
        }
      }

      // RPC returns single row: { dials, qhh, policies_sold, items_sold, lines_quoted, households_sold, premium_total }
      const row = data[0]
      
      const dials = Number(row.dials) || 0
      const qhh = Number(row.qhh) || 0
      const households_sold = Number(row.households_sold) || 0
      const items_sold = Number(row.items_sold) || 0
      const premium = Number(row.premium_total) || 0

      // Calculate conversion rates
      const dialToQhh = dials > 0 ? (qhh / dials * 100) : 0
      const qhhToShh = qhh > 0 ? (households_sold / qhh * 100) : 0
      const shhToItems = households_sold > 0 ? (items_sold / households_sold) : 0

      console.log('🔍 FUNNEL DATA:', { dials, qhh, households_sold, items_sold })

      const stages: ExecutionFunnelStage[] = [
        {
          stage_number: 1,
          stage_name: 'Dials',
          stage_value: dials,
          conversion_rate: 100,
          drop_off_count: 0,
          drop_off_rate: 0
        },
        {
          stage_number: 2,
          stage_name: 'QHH',
          stage_value: qhh,
          conversion_rate: dialToQhh,
          drop_off_count: dials - qhh,
          drop_off_rate: dials > 0 ? ((dials - qhh) / dials * 100) : 0
        },
        {
          stage_number: 3,
          stage_name: 'Sales',
          stage_value: households_sold,
          conversion_rate: qhhToShh,
          drop_off_count: qhh - households_sold,
          drop_off_rate: qhh > 0 ? ((qhh - households_sold) / qhh * 100) : 0
        },
        {
          stage_number: 4,
          stage_name: 'Items',
          stage_value: items_sold,
          conversion_rate: shhToItems * 100,
          drop_off_count: 0,
          drop_off_rate: 0
        },
        {
          stage_number: 5,
          stage_name: 'Premium',
          stage_value: premium,
          conversion_rate: 0,
          drop_off_count: 0,
          drop_off_rate: 0
        }
      ]

      return { 
        stages, 
        qhh: qhh 
      }
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
    queryKey: ['execution-benchmarks-unified-v2', fromDate, toDate, minPairQHH, minPairSHH, minPairDials],
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
        .rpc('get_execution_benchmarks_by_source' as any, {
          from_date: fromDate,
          to_date: toDate,
          source_filter: null,  // ← NULL to get all sources at once
          min_pair_qhh: minPairQHH,
          min_pair_shh: minPairSHH,
          min_pair_dials: minPairDials
        });

      if (benchmarkError) {
        console.error('❌ Error fetching benchmarks:', benchmarkError);
        throw benchmarkError;
      }

      if (!benchmarkData) {
        console.log('ℹ️ No benchmark data returned (insufficient volume or no data)');
        return [];
      }

      console.log('✅ Fetched execution benchmarks:', benchmarkData);

      return benchmarkData.map((item: any) => ({
        sourceId: item.source_id,
        sourceName: item.source_name,
        totalPairs: item.total_pairs,
        quoteRateNormal: parseFloat(item.quote_rate_normal),
        quoteRateExcellent: parseFloat(item.quote_rate_excellent),
        closeRateNormal: parseFloat(item.close_rate_normal),
        closeRateExcellent: parseFloat(item.close_rate_excellent),
        attachRateNormal: parseFloat(item.attach_rate_normal),
        attachRateExcellent: parseFloat(item.attach_rate_excellent)
      }));
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
    queryKey: ['execution-efficiency-v2', fromDate, toDate, producerId, sourceId, commissionPct],
    queryFn: async (): Promise<ExecutionEfficiency[]> => {
      // Always query daily_entries — never daily_entry_sources
      let query = supabase
        .from('daily_entries')
        .select('id, outbound_dials, qhh_total, sales_total, items_total')
        .gte('entry_date', fromDate)
        .lte('entry_date', toDate)

      if (producerId) query = query.eq('producer_id', producerId)

      const { data, error } = await query
      if (error) {
        console.error('❌ Error fetching efficiency base data:', error)
        throw error
      }

      const rows = data || []
      if (!rows.length) {
        return [
          { metric_name: 'Total Dials', metric_value: 0, metric_unit: 'dials' },
          { metric_name: 'Total QHH', metric_value: 0, metric_unit: 'households' },
          { metric_name: 'Total Sales', metric_value: 0, metric_unit: 'sales' },
          { metric_name: 'Total Items', metric_value: 0, metric_unit: 'items' },
          { metric_name: 'Total Premium', metric_value: 0, metric_unit: 'dollars' }
        ]
      }

      const entryIds = rows.map(r => r.id).filter(Boolean)
      let totalPremium = 0
      if (entryIds.length) {
        const { data: pData, error: pErr } = await supabase
          .from('premium_by_entry' as any)
          .select('total_premium')
          .in('daily_entry_id', entryIds)

        if (pErr) {
          console.error('❌ Error fetching premium:', pErr)
        } else {
          totalPremium = (pData || []).reduce((sum, r: any) => sum + (Number(r.total_premium) || 0), 0)
        }
      }

      const totalDials  = rows.reduce((s, r) => s + (Number(r.outbound_dials) || 0), 0)
      const totalQHH    = rows.reduce((s, r) => s + (Number(r.qhh_total) || 0), 0)
      const totalSales  = rows.reduce((s, r) => s + (Number(r.sales_total) || 0), 0)
      const totalItems  = rows.reduce((s, r) => s + (Number(r.items_total) || 0), 0)

      const metrics: ExecutionEfficiency[] = [
        { metric_name: 'Total Dials', metric_value: totalDials, metric_unit: 'dials' },
        { metric_name: 'Total QHH', metric_value: totalQHH, metric_unit: 'households' },
        { metric_name: 'Total Sales', metric_value: totalSales, metric_unit: 'sales' },
        { metric_name: 'Total Items', metric_value: totalItems, metric_unit: 'items' },
        { metric_name: 'Total Premium', metric_value: Math.round(totalPremium), metric_unit: 'dollars' },
        { metric_name: 'Premium per Dial', metric_value: totalDials > 0 ? Math.round((totalPremium / totalDials) * 100) / 100 : 0, metric_unit: '$/dial' },
        { metric_name: 'Commission per Dial', metric_value: totalDials > 0 ? Math.round((totalPremium * commissionPct / totalDials) * 100) / 100 : 0, metric_unit: '$/dial' },
        { metric_name: 'Items per Sale', metric_value: totalSales > 0 ? Math.round((totalItems / totalSales) * 100) / 100 : 0, metric_unit: 'items/sale' },
        { metric_name: 'Premium per Item', metric_value: totalItems > 0 ? Math.round(totalPremium / totalItems) : 0, metric_unit: '$/item' }
      ]

      return metrics
    },
    enabled: !!fromDate && !!toDate
  })
}

// ===== Hook 4: Producers for Filter =====

export const useProducersForExecution = () => {
  return useQuery({
    queryKey: ['producers-for-execution-filter-v2'],
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

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type GuidanceType = 'above_excellent' | 'normal_range' | 'needs_attention' | 'insufficient_volume' | 'no_benchmark';

interface ProducerLeaderboardRow {
  producer_id: string;
  producer_name: string;
  total_dials: number | null;
  total_qhh: number | null;
  quote_rate: number | null;
  quote_guidance: GuidanceType;
  total_shh: number | null;
  close_rate: number | null;
  close_guidance: GuidanceType;
  total_items: number | null;
  attach_rate: number | null;
  attach_guidance: GuidanceType;
  total_premium: number | null;
}

export const useProducerExecutionLeaderboard = (
  fromDate: string,
  toDate: string,
  sourceId: string | null = null,
  minDials: number = 50,
  minQHH: number = 10,
  minSHH: number = 3
) => {
  return useQuery({
    queryKey: ['producer-execution-leaderboard', fromDate, toDate, sourceId, minDials, minQHH, minSHH],
    queryFn: async (): Promise<ProducerLeaderboardRow[]> => {
      // Choose table based on source filter
      const tableName = sourceId ? 'producer_day_source_rollup' : 'producer_day_rollup';
      
      // Fetch rollup data without join
      let query = supabase
        .from(tableName as any)
        .select('producer_id, dials, qhh, shh, items, policies_sold, written_premium')
        .gte('entry_date', fromDate)
        .lte('entry_date', toDate);

      if (sourceId && tableName === 'producer_day_source_rollup') {
        query = query.eq('source_id', sourceId);
      }

      const { data: rollupData, error: rollupError } = await query;

      if (rollupError) {
        console.error('❌ Error fetching producer leaderboard rollup:', rollupError);
        throw rollupError;
      }

      if (!rollupData || rollupData.length === 0) return [];

      // Fetch producers separately
      const { data: producers, error: producersError } = await supabase
        .from('producers')
        .select('id, display_name');

      if (producersError) {
        console.error('❌ Error fetching producers:', producersError);
      }

      // Create lookup map for fast joins
      const producerMap = new Map(
        producers?.map(p => [p.id, p.display_name]) || []
      );

      // Fetch benchmarks for guidance
      const { data: benchmarkData, error: benchmarkError } = await supabase
        .from('producer_day_source_rollup' as any)
        .select('source_id, producer_id, qhh, shh, items')
        .gte('entry_date', fromDate)
        .lte('entry_date', toDate);

      if (benchmarkError) {
        console.error('❌ Error fetching benchmarks:', benchmarkError);
      }

      // Calculate benchmarks (50th and 75th percentiles)
      const calculatePercentile = (values: number[], percentile: number): number | null => {
        if (values.length === 0) return null;
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
      };

      // Group by source and calculate rates per producer
      const sourceProducerRates: Record<string, { quoteRates: number[], closeRates: number[], attachRates: number[] }> = {};
      
      if (benchmarkData && benchmarkData.length > 0) {
        const producerTotals: Record<string, Record<string, any>> = {};
        
        benchmarkData.forEach((row: any) => {
          const key = `${row.source_id}_${row.producer_id}`;
          if (!producerTotals[key]) {
            producerTotals[key] = { source_id: row.source_id, dials: 0, qhh: 0, shh: 0, items: 0 };
          }
          producerTotals[key].qhh += Number(row.qhh || 0);
          producerTotals[key].shh += Number(row.shh || 0);
          producerTotals[key].items += Number(row.items || 0);
        });

        Object.values(producerTotals).forEach((totals: any) => {
          const sourceId = totals.source_id;
          if (!sourceProducerRates[sourceId]) {
            sourceProducerRates[sourceId] = { quoteRates: [], closeRates: [], attachRates: [] };
          }
          
          if (totals.qhh >= minQHH) {
            const closeRate = totals.qhh > 0 ? (totals.shh / totals.qhh) * 100 : 0;
            if (totals.shh >= minSHH) {
              sourceProducerRates[sourceId].closeRates.push(closeRate);
              const attachRate = totals.shh > 0 ? totals.items / totals.shh : 0;
              sourceProducerRates[sourceId].attachRates.push(attachRate);
            }
          }
        });
      }

      // Create benchmark map
      const benchmarkMap = new Map<string, { 
        quote_normal: number | null, quote_excellent: number | null,
        close_normal: number | null, close_excellent: number | null,
        attach_normal: number | null, attach_excellent: number | null
      }>();

      Object.keys(sourceProducerRates).forEach(sourceId => {
        const rates = sourceProducerRates[sourceId];
        benchmarkMap.set(sourceId, {
          quote_normal: null, // Not calculated in this context
          quote_excellent: null,
          close_normal: calculatePercentile(rates.closeRates, 50),
          close_excellent: calculatePercentile(rates.closeRates, 75),
          attach_normal: calculatePercentile(rates.attachRates, 50),
          attach_excellent: calculatePercentile(rates.attachRates, 75),
        });
      });

      // Calculate overall benchmark when viewing all sources
      let overallBenchmark: {
        close_normal: number | null,
        close_excellent: number | null,
        attach_normal: number | null,
        attach_excellent: number | null
      } | null = null;

      if (!sourceId && benchmarkMap.size > 0) {
        // Aggregate all close rates and attach rates across all sources
        const allCloseRates: number[] = [];
        const allAttachRates: number[] = [];
        
        Object.values(sourceProducerRates).forEach(rates => {
          allCloseRates.push(...rates.closeRates);
          allAttachRates.push(...rates.attachRates);
        });
        
        console.log('🔍 Calculating overall benchmarks from all sources');
        console.log('📊 Total close rates collected:', allCloseRates.length);
        console.log('📊 Total attach rates collected:', allAttachRates.length);
        
        overallBenchmark = {
          close_normal: calculatePercentile(allCloseRates, 50),
          close_excellent: calculatePercentile(allCloseRates, 75),
          attach_normal: calculatePercentile(allAttachRates, 50),
          attach_excellent: calculatePercentile(allAttachRates, 75),
        };
        
        console.log('✅ Overall benchmarks calculated:', overallBenchmark);
      } else if (sourceId) {
        overallBenchmark = benchmarkMap.get(sourceId) || null;
        console.log(`✅ Using source-specific benchmark for source ${sourceId}:`, overallBenchmark);
      }

      // Aggregate by producer_id
      const aggregated = rollupData.reduce((acc: any, row: any) => {
        const producerId = row.producer_id;
        
        if (!acc[producerId]) {
          acc[producerId] = {
            producer_id: producerId,
            producer_name: producerMap.get(producerId) || 'Unknown',
            total_dials: 0,
            total_qhh: 0,
            total_shh: 0,
            total_items: 0,
            total_policies: 0,
            total_premium: 0,
          };
        }

        acc[producerId].total_dials += Number(row.dials || 0);
        acc[producerId].total_qhh += Number(row.qhh || 0);
        acc[producerId].total_shh += Number(row.shh || 0);
        acc[producerId].total_items += Number(row.items || 0);
        acc[producerId].total_policies += Number(row.policies_sold || 0);
        acc[producerId].total_premium += Number(row.written_premium || 0);

        return acc;
      }, {});

      // Helper to determine guidance
      const determineGuidance = (
        rate: number | null,
        normalBenchmark: number | null,
        excellentBenchmark: number | null,
        meetsThreshold: boolean
      ): GuidanceType => {
        if (!meetsThreshold || rate === null) return 'insufficient_volume';
        if (normalBenchmark === null || excellentBenchmark === null) return 'no_benchmark';
        if (rate >= excellentBenchmark) return 'above_excellent';
        if (rate >= normalBenchmark) return 'normal_range';
        return 'needs_attention';
      };

      // Convert to array and calculate rates
      const results = Object.values(aggregated).map((row: any) => {
        const quoteRate = row.total_dials > 0 ? (row.total_qhh / row.total_dials) * 100 : null;
        const closeRate = row.total_qhh > 0 ? (row.total_shh / row.total_qhh) * 100 : null;
        const attachRate = row.total_shh > 0 ? row.total_items / row.total_shh : null;

        // Apply minimum thresholds
        const meetsDialThreshold = row.total_dials >= minDials;
        const meetsQHHThreshold = row.total_qhh >= minQHH;
        const meetsSHHThreshold = row.total_shh >= minSHH;

        console.log(`\n👤 Producer: ${row.producer_name}`);
        console.log(`   Dials: ${row.total_dials} (threshold: ${minDials}, meets: ${meetsDialThreshold})`);
        console.log(`   QHH: ${row.total_qhh} (threshold: ${minQHH}, meets: ${meetsQHHThreshold})`);
        console.log(`   SHH: ${row.total_shh} (threshold: ${minSHH}, meets: ${meetsSHHThreshold})`);
        console.log(`   Close Rate: ${closeRate?.toFixed(2)}%`);
        console.log(`   Attach Rate: ${attachRate?.toFixed(2)}`);
        console.log(`   Benchmarks available:`, overallBenchmark);

        const closeGuidance = determineGuidance(
          closeRate,
          overallBenchmark?.close_normal ?? null,
          overallBenchmark?.close_excellent ?? null,
          meetsQHHThreshold && meetsSHHThreshold
        );

        const attachGuidance = determineGuidance(
          attachRate,
          overallBenchmark?.attach_normal ?? null,
          overallBenchmark?.attach_excellent ?? null,
          meetsSHHThreshold
        );

        console.log(`   Close Guidance: ${closeGuidance}`);
        console.log(`   Attach Guidance: ${attachGuidance}`);

        return {
          producer_id: row.producer_id,
          producer_name: row.producer_name,
          total_dials: meetsDialThreshold ? row.total_dials : null,
          total_qhh: meetsQHHThreshold ? row.total_qhh : null,
          quote_rate: meetsDialThreshold && meetsQHHThreshold ? quoteRate : null,
          quote_guidance: 'no_benchmark' as GuidanceType, // Quote rate benchmarks not available in this context
          total_shh: meetsSHHThreshold ? row.total_shh : null,
          close_rate: meetsQHHThreshold && meetsSHHThreshold ? closeRate : null,
          close_guidance: closeGuidance,
          total_items: meetsSHHThreshold ? row.total_items : null,
          attach_rate: meetsSHHThreshold ? attachRate : null,
          attach_guidance: attachGuidance,
          total_premium: row.total_premium,
        };
      });

      console.log(`\n✅ Final results count: ${results.length}`);
      return results as ProducerLeaderboardRow[];
    },
    enabled: !!fromDate && !!toDate
  });
};

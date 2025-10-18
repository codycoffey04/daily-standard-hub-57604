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

      // Helper to calculate percentiles (50th and 75th)
      const calculatePercentile = (values: number[], percentile: number): number | null => {
        if (values.length === 0) return null;
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
      };

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

      // First pass: Calculate all producer rates for benchmarking
      const producerRates: {
        quoteRates: number[],
        closeRates: number[],
        attachRates: number[]
      } = {
        quoteRates: [],
        closeRates: [],
        attachRates: []
      };

      Object.values(aggregated).forEach((row: any) => {
        const meetsDialThreshold = row.total_dials >= minDials;
        const meetsQHHThreshold = row.total_qhh >= minQHH;
        const meetsSHHThreshold = row.total_shh >= minSHH;
        
        if (meetsDialThreshold && meetsQHHThreshold) {
          const quoteRate = (row.total_qhh / row.total_dials) * 100;
          producerRates.quoteRates.push(quoteRate);
        }
        
        if (meetsQHHThreshold && meetsSHHThreshold) {
          const closeRate = (row.total_shh / row.total_qhh) * 100;
          producerRates.closeRates.push(closeRate);
        }
        
        if (meetsSHHThreshold) {
          const attachRate = row.total_policies / row.total_shh; // Use policies, not items
          producerRates.attachRates.push(attachRate);
        }
      });

      // Calculate producer-level benchmarks
      const producerBenchmarks = {
        quote_normal: calculatePercentile(producerRates.quoteRates, 50),
        quote_excellent: calculatePercentile(producerRates.quoteRates, 75),
        close_normal: calculatePercentile(producerRates.closeRates, 50),
        close_excellent: calculatePercentile(producerRates.closeRates, 75),
        attach_normal: calculatePercentile(producerRates.attachRates, 50),
        attach_excellent: calculatePercentile(producerRates.attachRates, 75),
      };

      console.log('🎯 Producer-level benchmarks calculated:', producerBenchmarks);
      console.log(`   Based on ${producerRates.quoteRates.length} quote rates, ${producerRates.closeRates.length} close rates, ${producerRates.attachRates.length} attach rates`);

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

      // Convert to array and calculate rates with guidance
      const results = Object.values(aggregated).map((row: any) => {
        const quoteRate = row.total_dials > 0 ? (row.total_qhh / row.total_dials) * 100 : null;
        const closeRate = row.total_qhh > 0 ? (row.total_shh / row.total_qhh) * 100 : null;
        const attachRate = row.total_shh > 0 ? row.total_policies / row.total_shh : null; // Use policies, not items

        // Apply minimum thresholds
        const meetsDialThreshold = row.total_dials >= minDials;
        const meetsQHHThreshold = row.total_qhh >= minQHH;
        const meetsSHHThreshold = row.total_shh >= minSHH;

        const quoteGuidance = determineGuidance(
          quoteRate,
          producerBenchmarks.quote_normal,
          producerBenchmarks.quote_excellent,
          meetsDialThreshold && meetsQHHThreshold
        );

        const closeGuidance = determineGuidance(
          closeRate,
          producerBenchmarks.close_normal,
          producerBenchmarks.close_excellent,
          meetsQHHThreshold && meetsSHHThreshold
        );

        const attachGuidance = determineGuidance(
          attachRate,
          producerBenchmarks.attach_normal,
          producerBenchmarks.attach_excellent,
          meetsSHHThreshold
        );

        console.log(`\n👤 Producer: ${row.producer_name}`);
        console.log(`   Dials: ${row.total_dials} (meets threshold: ${meetsDialThreshold})`);
        console.log(`   Quote Rate: ${quoteRate?.toFixed(2)}% → ${quoteGuidance}`);
        console.log(`   QHH: ${row.total_qhh} (meets threshold: ${meetsQHHThreshold})`);
        console.log(`   Close Rate: ${closeRate?.toFixed(2)}% → ${closeGuidance}`);
        console.log(`   SHH: ${row.total_shh} (meets threshold: ${meetsSHHThreshold})`);
        console.log(`   Policies: ${row.total_policies}, Attach Rate: ${attachRate?.toFixed(2)} → ${attachGuidance}`);
        console.log(`   Benchmarks: Q(${producerBenchmarks.quote_normal?.toFixed(1)}/${producerBenchmarks.quote_excellent?.toFixed(1)}) C(${producerBenchmarks.close_normal?.toFixed(1)}/${producerBenchmarks.close_excellent?.toFixed(1)}) A(${producerBenchmarks.attach_normal?.toFixed(2)}/${producerBenchmarks.attach_excellent?.toFixed(2)})`);

        return {
          producer_id: row.producer_id,
          producer_name: row.producer_name,
          total_dials: meetsDialThreshold ? row.total_dials : null,
          total_qhh: meetsQHHThreshold ? row.total_qhh : null,
          quote_rate: meetsDialThreshold && meetsQHHThreshold ? quoteRate : null,
          quote_guidance: quoteGuidance,
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

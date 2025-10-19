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

const BENCHMARKS = {
  quote_rate: {
    needs_attention: 3,    // < 3%
    normal_min: 3,         // 3-6%
    excellent: 6           // > 6%
  },
  close_rate: {
    needs_attention: 17,   // < 17%
    normal_min: 18,        // 18-24%
    normal_max: 24,
    excellent: 25          // 25-35%
  },
  attach_rate: {
    needs_attention: 1.2,  // < 1.2
    normal_min: 1.2,       // 1.2-1.5
    normal_max: 1.5,
    excellent: 1.5         // > 1.5
  }
};

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
        metric: 'quote_rate' | 'close_rate' | 'attach_rate',
        meetsThreshold: boolean
      ): GuidanceType => {
        if (!meetsThreshold || rate === null) return 'insufficient_volume';
        
        const thresholds = BENCHMARKS[metric];
        
        if (metric === 'close_rate') {
          // Close rate has a specific range for normal (18-24%)
          const closeThresholds = BENCHMARKS.close_rate;
          if (rate < closeThresholds.needs_attention) return 'needs_attention';
          if (rate >= closeThresholds.normal_min && rate <= closeThresholds.normal_max) return 'normal_range';
          if (rate >= closeThresholds.excellent) return 'above_excellent';
        } else {
          // Quote rate and attach rate use simpler logic
          if (rate < thresholds.needs_attention) return 'needs_attention';
          if (rate >= thresholds.normal_min && rate < thresholds.excellent) return 'normal_range';
          if (rate >= thresholds.excellent) return 'above_excellent';
        }
        
        return 'normal_range'; // fallback
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
          'quote_rate',
          meetsDialThreshold && meetsQHHThreshold
        );

        const closeGuidance = determineGuidance(
          closeRate,
          'close_rate',
          meetsQHHThreshold && meetsSHHThreshold
        );

        const attachGuidance = determineGuidance(
          attachRate,
          'attach_rate',
          meetsSHHThreshold
        );

        console.log(`\n👤 Producer: ${row.producer_name}`);
        console.log(`   Dials: ${row.total_dials} (meets threshold: ${meetsDialThreshold})`);
        console.log(`   Quote Rate: ${quoteRate?.toFixed(2)}% → ${quoteGuidance} (Benchmarks: <3%=attention, 3-6%=normal, >6%=excellent)`);
        console.log(`   QHH: ${row.total_qhh} (meets threshold: ${meetsQHHThreshold})`);
        console.log(`   Close Rate: ${closeRate?.toFixed(2)}% → ${closeGuidance} (Benchmarks: <17%=attention, 18-24%=normal, ≥25%=excellent)`);
        console.log(`   SHH: ${row.total_shh} (meets threshold: ${meetsSHHThreshold})`);
        console.log(`   Policies: ${row.total_policies}, Attach Rate: ${attachRate?.toFixed(2)} → ${attachGuidance} (Benchmarks: <1.2=attention, 1.2-1.5=normal, >1.5=excellent)`);

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

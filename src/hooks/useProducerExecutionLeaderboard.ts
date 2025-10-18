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

      // Convert to array and calculate rates
      const results = Object.values(aggregated).map((row: any) => {
        const quoteRate = row.total_dials > 0 ? (row.total_qhh / row.total_dials) * 100 : null;
        const closeRate = row.total_qhh > 0 ? (row.total_shh / row.total_qhh) * 100 : null;
        const attachRate = row.total_shh > 0 ? row.total_items / row.total_shh : null;

        // Apply minimum thresholds
        const meetsDialThreshold = row.total_dials >= minDials;
        const meetsQHHThreshold = row.total_qhh >= minQHH;
        const meetsSHHThreshold = row.total_shh >= minSHH;

        return {
          producer_id: row.producer_id,
          producer_name: row.producer_name,
          total_dials: meetsDialThreshold ? row.total_dials : null,
          total_qhh: meetsQHHThreshold ? row.total_qhh : null,
          quote_rate: meetsDialThreshold && meetsQHHThreshold ? quoteRate : null,
          quote_guidance: 'no_benchmark' as GuidanceType, // Will be updated with benchmarks
          total_shh: meetsSHHThreshold ? row.total_shh : null,
          close_rate: meetsQHHThreshold && meetsSHHThreshold ? closeRate : null,
          close_guidance: 'no_benchmark' as GuidanceType,
          total_items: meetsSHHThreshold ? row.total_items : null,
          attach_rate: meetsSHHThreshold ? attachRate : null,
          attach_guidance: 'no_benchmark' as GuidanceType,
          total_premium: row.total_premium,
        };
      });

      return results as ProducerLeaderboardRow[];
    },
    enabled: !!fromDate && !!toDate
  });
};

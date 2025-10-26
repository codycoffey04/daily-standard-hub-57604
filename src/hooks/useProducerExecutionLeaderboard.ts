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
    needs_attention: 4.5,   // < 4.5%
    normal_min: 4.5,        // 4.5-5.0%
    normal_max: 5.0,
    excellent: 5.0          // > 5.0%
  },
  close_rate: {
    needs_attention: 19,    // < 19%
    normal_min: 19,         // 19-22%
    normal_max: 22,
    excellent: 22           // > 22%
  },
  attach_rate: {
    needs_attention: 1.33,  // < 1.33
    normal_min: 1.33,       // 1.33-1.38
    normal_max: 1.38,
    excellent: 1.38         // > 1.38
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
      console.log('🔄 Fetching producer execution leaderboard via RPC...');
      console.log('📅 Date range:', fromDate, 'to', toDate);
      console.log('🎯 Source filter:', sourceId || 'All sources');
      console.log('📊 Thresholds - Dials:', minDials, 'QHH:', minQHH, 'SHH:', minSHH);
      
      const { data, error } = await supabase.rpc('get_producer_execution_leaderboard' as any, {
        from_date: fromDate,
        to_date: toDate,
        source_filter: sourceId,
        min_dials: minDials,
        min_qhh: minQHH,
        min_shh: minSHH,
        min_pair_qhh: 30,
        min_pair_shh: 10,
        min_pair_dials: 200
      }) as { data: ProducerLeaderboardRow[] | null, error: any };

      if (error) {
        console.error('❌ Error fetching producer execution leaderboard:', error);
        throw error;
      }

      console.log(`✅ Leaderboard data fetched: ${data?.length || 0} producers`);
      if (data && data.length > 0) {
        console.log('📊 Sample producer data:', data[0]);
      }

      return data || [];
    },
    enabled: !!fromDate && !!toDate,
    staleTime: 30000, // 30 seconds
    gcTime: 300000 // 5 minutes
  });
};

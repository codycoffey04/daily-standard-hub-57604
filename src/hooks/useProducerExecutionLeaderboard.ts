import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProducerExecutionLeaderboard = (
  fromDate: string,
  toDate: string,
  sourceId: string | null = null
) => {
  return useQuery({
    queryKey: ['producer-execution-leaderboard', fromDate, toDate, sourceId],
    queryFn: async () => {
      console.log('🚀 LEADERBOARD RPC PARAMS:', {
        from_date: fromDate,
        to_date: toDate,
        source_filter: sourceId,
        min_dials: 200,
        min_qhh: 30,
        min_shh: 10,
        min_pair_qhh: 30,
        min_pair_shh: 10,
        min_pair_dials: 200
      });
      const { data, error } = await supabase.rpc('get_producer_execution_leaderboard' as any, {
        from_date: fromDate,
        to_date: toDate,
        source_filter: sourceId,
        min_dials: 200,
        min_qhh: 30,
        min_shh: 10,
        min_pair_qhh: 30,
        min_pair_shh: 10,
        min_pair_dials: 200
      });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!fromDate && !!toDate
  });
};

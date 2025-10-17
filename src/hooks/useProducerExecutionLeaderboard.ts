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
      
      // Map SQL field names to frontend expected names
      const mappedData = (data || []).map(row => ({
        ...row,
        total_dials: row.dials,
        total_qhh: row.qhh,
        total_shh: row.shh,
        total_items: row.items,
        total_premium: row.written_premium,
      }));
      
      return mappedData;
    },
    enabled: !!fromDate && !!toDate
  });
};

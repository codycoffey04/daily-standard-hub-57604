import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Inline numeric coercion utility
function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

// ACTUAL RPC RETURN STRUCTURE (Schema A only - no guidance/benchmarks)
interface ProducerLeaderboardRow {
  producer_id: string;
  producer_name: string;
  dials: number;
  qhh: number;
  households_sold: number;
  items_sold: number;
  total_premium: number;
  rank_by_sales: number;
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
      console.log('🔄 Fetching producer execution leaderboard via RPC...');
      console.log('📅 Date range:', fromDate, 'to', toDate);
      console.log('🎯 Source filter:', sourceId || 'All sources');
      console.log('📊 Thresholds - Dials:', minDials, 'QHH:', minQHH, 'SHH:', minSHH);
      
      const rpcParams = {
        from_date: fromDate,
        to_date: toDate,
        source_filter: sourceId,
        min_dials: minDials,
        min_qhh: minQHH,
        min_shh: minSHH,
        min_pair_qhh: 10,
        min_pair_shh: 0,
        min_pair_dials: 100
      };
      console.log('[LEADERBOARD] Exact RPC params:', JSON.stringify(rpcParams, null, 2));
      
      const { data, error } = await supabase.rpc('get_producer_execution_leaderboard' as any, {
        from_date: fromDate,
        to_date: toDate,
        source_filter: sourceId,
        min_dials: minDials,
        min_qhh: minQHH,
        min_shh: minSHH,
        min_pair_qhh: 10,
        min_pair_shh: 0,
        min_pair_dials: 100
      }) as { data: any[] | null, error: any };

      console.log('[LEADERBOARD] RPC response - data:', data, 'error:', error);

      if (error) {
        console.error('❌ Error fetching producer execution leaderboard:', error);
        throw error;
      }

      console.log('[get_producer_execution_leaderboard] raw:', data);

      // Map and coerce numeric fields from database response
      const parsed = (data || []).map((row: any) => ({
        producer_id: row.producer_id,
        producer_name: row.producer_name,
        dials: toNum(row.total_dials),
        qhh: toNum(row.total_qhh),
        households_sold: toNum(row.total_shh),
        items_sold: toNum(row.total_items),
        total_premium: toNum(row.total_premium),
        rank_by_sales: 0  // Will be calculated below
      }));

      // Sort by total_premium descending and assign ranks
      const ranked = parsed
        .sort((a, b) => b.total_premium - a.total_premium)
        .map((producer, index) => ({
          ...producer,
          rank_by_sales: index + 1  // Rank 1 = highest premium
        }));

      console.log('[useProducerExecutionLeaderboard] ranked:', ranked);

      return ranked;
    },
    enabled: !!fromDate && !!toDate,
    staleTime: 30000,
    gcTime: 300000
  });
};

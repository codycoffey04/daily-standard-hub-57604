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
  policies_sold: number;
  households_sold: number;
  items_sold: number;
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
      
      const { data, error } = await supabase.rpc('get_producer_execution_leaderboard' as any, {
        from_date: fromDate,
        to_date: toDate,
        source_filter: sourceId,
        min_dials: minDials,
        min_qhh: minQHH,
        min_shh: minSHH
      }) as { data: any[] | null, error: any };

      if (error) {
        console.error('❌ Error fetching producer execution leaderboard:', error);
        throw error;
      }

      console.log('[get_producer_execution_leaderboard] raw:', data);

      // Map and coerce numeric fields
      const parsed = (data || []).map((row: any) => ({
        producer_id: row.producer_id,
        producer_name: row.producer_name,
        dials: toNum(row.dials),
        qhh: toNum(row.qhh),
        policies_sold: toNum(row.policies_sold),
        households_sold: toNum(row.households_sold),
        items_sold: toNum(row.items_sold),
        rank_by_sales: toNum(row.rank_by_sales)
      }));

      console.log('[useProducerExecutionLeaderboard] parsed:', parsed);

      return parsed;
    },
    enabled: !!fromDate && !!toDate,
    staleTime: 30000,
    gcTime: 300000
  });
};

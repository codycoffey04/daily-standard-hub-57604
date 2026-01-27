import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CSRLeaderboardEntry {
  rank: number;
  csr_profile_id: string;
  csr_name: string;
  ytd_points: number;
  mtd_points: number;
  wtd_points: number;
}

export const useCSRLeaderboard = (year?: number) => {
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['csr-leaderboard', currentYear],
    queryFn: async (): Promise<CSRLeaderboardEntry[]> => {
      const { data, error } = await supabase.rpc('get_csr_leaderboard' as any, {
        p_year: currentYear
      });

      if (error) {
        console.error('Error fetching CSR leaderboard:', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        rank: Number(row.rank),
        csr_profile_id: row.csr_profile_id,
        csr_name: row.csr_name,
        ytd_points: row.ytd_points || 0,
        mtd_points: row.mtd_points || 0,
        wtd_points: row.wtd_points || 0
      }));
    },
    staleTime: 30000,
    gcTime: 300000
  });
};

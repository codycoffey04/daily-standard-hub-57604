import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type YTDPerformanceData = {
  producer_id: string;
  producer_name: string;
  entry_month: string;
  qhh: number;
  items: number;
  sales: number;
  dials: number;
  talk_minutes: number;
};

export function useYTDPerformance(fromYm: string | null, toYm: string | null) {
  return useQuery({
    queryKey: ['ytd-performance', fromYm, toYm],
    queryFn: async () => {
      if (!fromYm || !toYm) return [];
      
      const { data, error } = await supabase.rpc('get_ytd_performance', {
        from_ym: fromYm,
        to_ym: toYm
      });
      
      if (error) {
        console.error('Error fetching YTD performance:', error);
        throw error;
      }
      
      return (data as YTDPerformanceData[]) || [];
    },
    enabled: Boolean(fromYm && toYm)
  });
}

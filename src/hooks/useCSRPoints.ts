import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CSRPeriod = 'week' | 'month' | 'ytd';

interface CSRPointsSummary {
  csr_profile_id: string;
  csr_name: string;
  referral_closed_pts: number;
  referral_quoted_pts: number;
  google_review_pts: number;
  retention_save_pts: number;
  new_customer_referral_pts: number;
  winback_closed_pts: number;
  winback_quoted_pts: number;
  total_points: number;
  activity_count: number;
}

export const useCSRPoints = (period: CSRPeriod = 'ytd', csrProfileId?: string) => {
  return useQuery({
    queryKey: ['csr-points-summary', period, csrProfileId],
    queryFn: async (): Promise<CSRPointsSummary[]> => {
      const { data, error } = await supabase.rpc('get_csr_points_summary' as any, {
        p_period: period,
        p_csr_profile_id: csrProfileId || null
      });

      if (error) {
        console.error('Error fetching CSR points summary:', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        csr_profile_id: row.csr_profile_id,
        csr_name: row.csr_name,
        referral_closed_pts: row.referral_closed_pts || 0,
        referral_quoted_pts: row.referral_quoted_pts || 0,
        google_review_pts: row.google_review_pts || 0,
        retention_save_pts: row.retention_save_pts || 0,
        new_customer_referral_pts: row.new_customer_referral_pts || 0,
        winback_closed_pts: row.winback_closed_pts || 0,
        winback_quoted_pts: row.winback_quoted_pts || 0,
        total_points: row.total_points || 0,
        activity_count: Number(row.activity_count) || 0
      }));
    },
    staleTime: 30000,
    gcTime: 300000
  });
};

// Hook to get points config (goals, point values)
export const useCSRPointsConfig = () => {
  return useQuery({
    queryKey: ['csr-points-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_framework_config')
        .select('config_data')
        .eq('config_type', 'csr_points_config')
        .eq('active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching CSR points config:', error);
        throw error;
      }

      const config = data?.config_data as {
        points: Record<string, number>;
        goals: { weekly: number; monthly: number; yearly: number };
        badges: Array<{ type: string; name: string; description: string; icon: string }>;
      } | null;

      return config || {
        points: {
          referral_closed: 15,
          referral_quoted: 5,
          google_review: 10,
          retention_save: 10,
          new_customer_referral: 10,
          winback_closed: 10,
          winback_quoted: 3
        },
        goals: {
          weekly: 10,
          monthly: 40,
          yearly: 480
        },
        badges: []
      };
    },
    staleTime: 300000,
    gcTime: 600000
  });
};

// Hook to get current CSR profile for logged-in user
export const useCurrentCSRProfile = () => {
  return useQuery({
    queryKey: ['current-csr-profile'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_current_csr_profile' as any);

      if (error) {
        console.error('Error fetching current CSR profile:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const profile = data[0];
      return {
        csr_profile_id: profile.csr_profile_id,
        display_name: profile.display_name,
        email: profile.email,
        source_id: profile.source_id
      };
    },
    staleTime: 60000,
    gcTime: 300000
  });
};

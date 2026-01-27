import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ManualActivityType =
  | 'google_review'
  | 'retention_save'
  | 'new_customer_referral'
  | 'winback_closed'
  | 'winback_quoted';

export const MANUAL_ACTIVITY_TYPES: { value: ManualActivityType; label: string; points: number }[] = [
  { value: 'google_review', label: 'Google Review', points: 10 },
  { value: 'retention_save', label: 'Retention Save', points: 10 },
  { value: 'new_customer_referral', label: 'New Customer Referral', points: 10 },
  { value: 'winback_closed', label: 'Win-Back Closed', points: 10 },
  { value: 'winback_quoted', label: 'Win-Back Quoted', points: 3 }
];

export const ALL_ACTIVITY_LABELS: Record<string, string> = {
  referral_closed: 'Referral Closed',
  referral_quoted: 'Referral Quoted',
  google_review: 'Google Review',
  retention_save: 'Retention Save',
  new_customer_referral: 'New Customer Referral',
  winback_closed: 'Win-Back Closed',
  winback_quoted: 'Win-Back Quoted'
};

interface CSRActivity {
  id: string;
  csr_profile_id: string;
  activity_type: string;
  points: number;
  activity_date: string;
  customer_name: string | null;
  notes: string | null;
  source: 'auto' | 'manual';
  created_at: string;
  csr_name?: string;
}

interface CreateActivityInput {
  csr_profile_id: string;
  activity_type: ManualActivityType;
  points: number;
  activity_date: string;
  customer_name: string;
  notes?: string;
}

interface GetActivitiesParams {
  csrProfileId?: string;
  activityType?: string;
  page?: number;
  pageSize?: number;
}

export const useCSRActivities = (params: GetActivitiesParams = {}) => {
  const { csrProfileId, activityType, page = 1, pageSize = 10 } = params;

  return useQuery({
    queryKey: ['csr-activities', csrProfileId, activityType, page, pageSize],
    queryFn: async (): Promise<{ data: CSRActivity[]; count: number }> => {
      let query = supabase
        .from('csr_activities')
        .select(`
          id,
          csr_profile_id,
          activity_type,
          points,
          activity_date,
          customer_name,
          notes,
          source,
          created_at,
          csr_profiles!inner(display_name)
        `, { count: 'exact' })
        .order('activity_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (csrProfileId) {
        query = query.eq('csr_profile_id', csrProfileId);
      }

      if (activityType) {
        query = query.eq('activity_type', activityType);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching CSR activities:', error);
        throw error;
      }

      const activities: CSRActivity[] = (data || []).map((row: any) => ({
        id: row.id,
        csr_profile_id: row.csr_profile_id,
        activity_type: row.activity_type,
        points: row.points,
        activity_date: row.activity_date,
        customer_name: row.customer_name,
        notes: row.notes,
        source: row.source,
        created_at: row.created_at,
        csr_name: row.csr_profiles?.display_name
      }));

      return { data: activities, count: count || 0 };
    },
    staleTime: 30000,
    gcTime: 300000
  });
};

export const useCreateCSRActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateActivityInput) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('csr_activities')
        .insert({
          csr_profile_id: input.csr_profile_id,
          activity_type: input.activity_type,
          points: input.points,
          activity_date: input.activity_date,
          customer_name: input.customer_name,
          notes: input.notes || null,
          source: 'manual',
          created_by: user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating CSR activity:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: `+${data.points} points!`,
        description: 'Activity logged successfully',
        duration: 3000
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['csr-activities'] });
      queryClient.invalidateQueries({ queryKey: ['csr-points-summary'] });
      queryClient.invalidateQueries({ queryKey: ['csr-leaderboard'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to log activity',
        variant: 'destructive'
      });
    }
  });
};

export const useDeleteCSRActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('csr_activities')
        .delete()
        .eq('id', activityId);

      if (error) {
        console.error('Error deleting CSR activity:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Activity deleted',
        description: 'The activity has been removed'
      });

      queryClient.invalidateQueries({ queryKey: ['csr-activities'] });
      queryClient.invalidateQueries({ queryKey: ['csr-points-summary'] });
      queryClient.invalidateQueries({ queryKey: ['csr-leaderboard'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete activity',
        variant: 'destructive'
      });
    }
  });
};

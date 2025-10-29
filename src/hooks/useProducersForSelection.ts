import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface ProducerForSelection {
  id: string
  display_name: string
}

export function useProducersForSelection() {
  return useQuery({
    queryKey: ['producers-for-selection'],
    queryFn: async (): Promise<ProducerForSelection[]> => {
      const { data, error } = await supabase
        .from('producers')
        .select('id, display_name')
        .eq('active', true)
        .order('display_name')
      
      if (error) throw error
      return data || []
    }
  })
}

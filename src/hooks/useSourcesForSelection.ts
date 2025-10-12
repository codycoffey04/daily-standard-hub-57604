import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface Source {
  id: string
  name: string
  sort_order: number
  active: boolean
}

// Hook to load all sources with proper sorting for selection dropdowns
export const useSourcesForSelection = () => {
  return useQuery({
    queryKey: ['sources-for-selection'],
    queryFn: async (): Promise<Source[]> => {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      
      if (error) throw error
      return data || []
    }
  })
}
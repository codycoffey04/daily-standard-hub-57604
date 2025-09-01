import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface Source {
  id: string
  name: string
  sort_order: number
  active: boolean
}

// Utility function to sort sources with "Other" always last
export const sortSourcesWithOtherLast = (sources: Source[]): Source[] => {
  return sources.sort((a, b) => {
    // Always put "Other" last
    if (a.name === 'Other') return 1
    if (b.name === 'Other') return -1
    
    // Sort alphabetically by name for all others
    return a.name.localeCompare(b.name)
  })
}

// Hook to load all sources with proper sorting for selection dropdowns
export const useSourcesForSelection = () => {
  return useQuery({
    queryKey: ['sources-for-selection'],
    queryFn: async (): Promise<Source[]> => {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .order('name') // Initial sort by name for consistency
      
      if (error) throw error
      
      // Apply special "Other" last sorting
      return sortSourcesWithOtherLast(data || [])
    }
  })
}
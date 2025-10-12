import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

export interface SourceInput {
  name: string
  active: boolean
  sort_order: number
}

// CREATE: Add new source
export function useCreateSource() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (input: SourceInput) => {
      const { data, error } = await supabase
        .from('sources')
        .insert({
          name: input.name,
          active: input.active,
          sort_order: input.sort_order
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      toast({
        title: 'Success',
        description: 'Source created successfully'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// UPDATE: Update existing source
export function useUpdateSource() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...input }: SourceInput & { id: string }) => {
      const { data, error } = await supabase
        .from('sources')
        .update({
          name: input.name,
          active: input.active,
          sort_order: input.sort_order
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      toast({
        title: 'Success',
        description: 'Source updated successfully'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

// DELETE: Delete source (will cascade to source_costs)
export function useDeleteSource() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sources')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] })
      queryClient.invalidateQueries({ queryKey: ['source-roi'] })
      toast({
        title: 'Success',
        description: 'Source deleted successfully'
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  })
}

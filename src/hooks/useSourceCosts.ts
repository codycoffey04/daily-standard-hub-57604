import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'

export interface SourceCost {
  id: string
  source_id: string
  month: string
  cost: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SourceCostInput {
  source_id: string
  month: string
  cost: number
  notes?: string | null
}

// GET: Fetch all costs for a source
export function useSourceCosts(sourceId: string) {
  return useQuery({
    queryKey: ['source-costs', sourceId],
    queryFn: async (): Promise<SourceCost[]> => {
      const { data, error } = await (supabase as any)
        .from('source_costs')
        .select('*')
        .eq('source_id', sourceId)
        .order('month', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!sourceId
  })
}

// POST: Create new cost
export function useCreateSourceCost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (input: SourceCostInput) => {
      const { data, error } = await (supabase as any)
        .from('source_costs')
        .insert({
          source_id: input.source_id,
          month: input.month,
          cost: input.cost,
          notes: input.notes || null
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['source-costs', variables.source_id] })
      queryClient.invalidateQueries({ queryKey: ['source-roi'] })
      toast({
        title: 'Success',
        description: 'Cost added successfully'
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

// PUT: Update existing cost
export function useUpdateSourceCost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...input }: SourceCostInput & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('source_costs')
        .update({
          month: input.month,
          cost: input.cost,
          notes: input.notes || null
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['source-costs', variables.source_id] })
      queryClient.invalidateQueries({ queryKey: ['source-roi'] })
      toast({
        title: 'Success',
        description: 'Cost updated successfully'
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

// DELETE: Delete cost
export function useDeleteSourceCost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, sourceId }: { id: string; sourceId: string }) => {
      const { error } = await (supabase as any)
        .from('source_costs')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return { id, sourceId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['source-costs', result.sourceId] })
      queryClient.invalidateQueries({ queryKey: ['source-roi'] })
      toast({
        title: 'Success',
        description: 'Cost deleted successfully'
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

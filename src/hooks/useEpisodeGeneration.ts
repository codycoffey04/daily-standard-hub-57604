import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Database } from '@/integrations/supabase/types'

type CoachingEpisode = Database['public']['Tables']['coaching_episodes']['Row']
type CoachingScore = Database['public']['Tables']['coaching_scores']['Row']
type Producer = Database['public']['Tables']['producers']['Row']

function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0]
}

interface GenerationStatus {
  producerId: string
  status: 'idle' | 'generating' | 'completed' | 'error'
  error?: string
}

export function useEpisodeGeneration(weekStart: Date) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const weekStartStr = formatDateForDB(weekStart)

  const [generationStatus, setGenerationStatus] = useState<Record<string, GenerationStatus>>({})

  // Fetch existing episodes for this week
  const {
    data: episodes = [],
    isLoading: isLoadingEpisodes
  } = useQuery({
    queryKey: ['coaching-episodes', weekStartStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_episodes')
        .select('*')
        .eq('week_start', weekStartStr)

      if (error) throw error
      return data as CoachingEpisode[]
    }
  })

  // Fetch scores for episodes
  const {
    data: scores = [],
    isLoading: isLoadingScores
  } = useQuery({
    queryKey: ['coaching-scores', weekStartStr],
    queryFn: async () => {
      if (episodes.length === 0) return []

      const episodeIds = episodes.map(e => e.id)
      const { data, error } = await supabase
        .from('coaching_scores')
        .select('*')
        .in('episode_id', episodeIds)

      if (error) throw error
      return data as CoachingScore[]
    },
    enabled: episodes.length > 0
  })

  // Fetch producers
  const { data: producers = [] } = useQuery({
    queryKey: ['producers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producers')
        .select('*')
        .eq('active', true)
        .order('display_name')

      if (error) throw error
      return data as Producer[]
    }
  })

  // Generate episode for a single producer
  const generateForProducer = useCallback(async (producerId: string) => {
    setGenerationStatus(prev => ({
      ...prev,
      [producerId]: { producerId, status: 'generating' }
    }))

    try {
      const { data, error } = await supabase.functions.invoke('generate-coaching-episode', {
        body: {
          producerId,
          weekStart: weekStartStr
        }
      })

      if (error) throw error

      if (!data.success) {
        throw new Error(data.error || 'Generation failed')
      }

      setGenerationStatus(prev => ({
        ...prev,
        [producerId]: { producerId, status: 'completed' }
      }))

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['coaching-episodes', weekStartStr] })
      queryClient.invalidateQueries({ queryKey: ['coaching-scores', weekStartStr] })

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      setGenerationStatus(prev => ({
        ...prev,
        [producerId]: { producerId, status: 'error', error: errorMessage }
      }))

      throw error
    }
  }, [weekStartStr, queryClient])

  // Generate episodes for all producers
  const generateAll = useMutation({
    mutationFn: async () => {
      const results = []

      for (const producer of producers) {
        try {
          const result = await generateForProducer(producer.id)
          results.push({ producerId: producer.id, success: true, result })
        } catch (error) {
          results.push({
            producerId: producer.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return results
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length
      const failCount = results.length - successCount

      if (failCount === 0) {
        toast({
          title: 'Episodes generated',
          description: `Successfully generated ${successCount} coaching episodes.`
        })
      } else {
        toast({
          title: 'Partial success',
          description: `Generated ${successCount} episodes, ${failCount} failed.`,
          variant: 'destructive'
        })
      }
    },
    onError: (error) => {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      })
    }
  })

  // Get episode for a specific producer
  const getEpisodeForProducer = (producerId: string): CoachingEpisode | null => {
    return episodes.find(e => e.producer_id === producerId) || null
  }

  // Get scores for a specific episode
  const getScoresForEpisode = (episodeId: string): CoachingScore[] => {
    return scores.filter(s => s.episode_id === episodeId)
  }

  // Check if generation is in progress
  const isGenerating = Object.values(generationStatus).some(s => s.status === 'generating')

  return {
    episodes,
    scores,
    producers,
    isLoading: isLoadingEpisodes || isLoadingScores,
    generationStatus,
    generateForProducer,
    generateAll: () => generateAll.mutate(),
    isGeneratingAll: generateAll.isPending,
    isGenerating,
    getEpisodeForProducer,
    getScoresForEpisode
  }
}

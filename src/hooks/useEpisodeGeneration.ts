import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Database } from '@/integrations/supabase/types'

type CoachingEpisode = Database['public']['Tables']['coaching_episodes']['Row']
type CoachingScore = Database['public']['Tables']['coaching_scores']['Row']
type CoachingType = 'sales' | 'service'

// Generic team member interface for both producers and CSRs
interface TeamMember {
  id: string
  display_name: string
}

function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0]
}

interface GenerationStatus {
  memberId: string
  status: 'idle' | 'generating' | 'completed' | 'error'
  error?: string
}

export function useEpisodeGeneration(weekStart: Date, coachingType: CoachingType = 'sales') {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const weekStartStr = formatDateForDB(weekStart)

  const [generationStatus, setGenerationStatus] = useState<Record<string, GenerationStatus>>({})

  // Fetch existing episodes for this week and coaching type
  const {
    data: episodes = [],
    isLoading: isLoadingEpisodes
  } = useQuery({
    queryKey: ['coaching-episodes', weekStartStr, coachingType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_episodes')
        .select('*')
        .eq('week_start', weekStartStr)
        .eq('coaching_type', coachingType)

      if (error) throw error
      return data as CoachingEpisode[]
    }
  })

  // Fetch scores for episodes
  const {
    data: scores = [],
    isLoading: isLoadingScores
  } = useQuery({
    queryKey: ['coaching-scores', weekStartStr, coachingType],
    queryFn: async () => {
      if (episodes.length === 0) return []

      const episodeIds = episodes.map(e => e.id)
      const { data, error } = await supabase
        .from('coaching_scores')
        .select('*')
        .in('episode_id', episodeIds)
        .eq('coaching_type', coachingType)

      if (error) throw error
      return data as CoachingScore[]
    },
    enabled: episodes.length > 0
  })

  // Fetch team members based on coaching type
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', coachingType],
    queryFn: async (): Promise<TeamMember[]> => {
      if (coachingType === 'sales') {
        const { data, error } = await supabase
          .from('producers')
          .select('id, display_name')
          .eq('active', true)
          .order('display_name')

        if (error) throw error
        return data as TeamMember[]
      } else {
        // Service mode - fetch CSR profiles
        const { data, error } = await supabase
          .from('csr_profiles')
          .select('id, display_name')
          .eq('active', true)
          .order('display_name')

        if (error) throw error
        return data as TeamMember[]
      }
    }
  })

  // Generate episode for a single team member
  const generateForMember = useCallback(async (memberId: string) => {
    setGenerationStatus(prev => ({
      ...prev,
      [memberId]: { memberId, status: 'generating' }
    }))

    try {
      // Build request body based on coaching type
      const requestBody: Record<string, any> = {
        weekStart: weekStartStr,
        coachingType
      }

      if (coachingType === 'sales') {
        requestBody.producerId = memberId
      } else {
        requestBody.csrProfileId = memberId
      }

      const { data, error } = await supabase.functions.invoke('generate-coaching-episode', {
        body: requestBody
      })

      if (error) throw error

      if (!data.success) {
        throw new Error(data.error || 'Generation failed')
      }

      setGenerationStatus(prev => ({
        ...prev,
        [memberId]: { memberId, status: 'completed' }
      }))

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['coaching-episodes', weekStartStr, coachingType] })
      queryClient.invalidateQueries({ queryKey: ['coaching-scores', weekStartStr, coachingType] })

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      setGenerationStatus(prev => ({
        ...prev,
        [memberId]: { memberId, status: 'error', error: errorMessage }
      }))

      throw error
    }
  }, [weekStartStr, coachingType, queryClient])

  // Generate episodes for all team members
  const generateAll = useMutation({
    mutationFn: async () => {
      const results = []

      for (const member of teamMembers) {
        try {
          const result = await generateForMember(member.id)
          results.push({ memberId: member.id, success: true, result })
        } catch (error) {
          results.push({
            memberId: member.id,
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
      const entityName = coachingType === 'sales' ? 'producer' : 'CSR'

      if (failCount === 0) {
        toast({
          title: 'Episodes generated',
          description: `Successfully generated ${successCount} ${entityName} coaching episodes.`
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

  // Get episode for a specific team member
  const getEpisodeForMember = (memberId: string): CoachingEpisode | null => {
    return episodes.find(e =>
      coachingType === 'sales'
        ? e.producer_id === memberId
        : (e as any).csr_profile_id === memberId
    ) || null
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
    // Backwards compatibility: expose as both 'producers' and 'teamMembers'
    producers: teamMembers,
    teamMembers,
    isLoading: isLoadingEpisodes || isLoadingScores,
    generationStatus,
    generateForProducer: generateForMember, // Backwards compatibility
    generateForMember,
    generateAll: () => generateAll.mutate(),
    isGeneratingAll: generateAll.isPending,
    isGenerating,
    getEpisodeForProducer: getEpisodeForMember, // Backwards compatibility
    getEpisodeForMember,
    getScoresForEpisode,
    coachingType
  }
}

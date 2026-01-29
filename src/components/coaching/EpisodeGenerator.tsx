import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, CheckCircle, AlertCircle, User } from 'lucide-react'
import type { Database } from '@/integrations/supabase/types'

type CoachingEpisode = Database['public']['Tables']['coaching_episodes']['Row']
type CoachingType = 'sales' | 'service'

// Generic team member interface for both producers and CSRs
interface TeamMember {
  id: string
  display_name: string
}

interface GenerationStatus {
  memberId: string
  status: 'idle' | 'generating' | 'completed' | 'error'
  error?: string
}

interface EpisodeGeneratorProps {
  teamMembers: TeamMember[]
  episodes: CoachingEpisode[]
  generationStatus: Record<string, GenerationStatus>
  onGenerateAll: () => void
  onGenerateForMember: (memberId: string) => void
  isGenerating: boolean
  canGenerate: boolean
  coachingType?: CoachingType
  memberLabel?: string // 'Producer' or 'CSR'
}

export const EpisodeGenerator: React.FC<EpisodeGeneratorProps> = ({
  teamMembers,
  episodes,
  generationStatus,
  onGenerateAll,
  onGenerateForMember,
  isGenerating,
  canGenerate,
  coachingType = 'sales',
  memberLabel = 'Producer'
}) => {
  const getMemberStatus = (memberId: string) => {
    const status = generationStatus[memberId]
    // Check for existing episode - check both producer_id and csr_profile_id
    const existingEpisode = episodes.find(e =>
      coachingType === 'sales'
        ? e.producer_id === memberId
        : (e as any).csr_profile_id === memberId
    )

    if (status?.status === 'generating') return 'generating'
    if (status?.status === 'error') return 'error'
    if (status?.status === 'completed' || existingEpisode) return 'completed'
    return 'idle'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return null
    }
  }

  const allCompleted = teamMembers.every(m => getMemberStatus(m.id) === 'completed')
  const someCompleted = teamMembers.some(m => getMemberStatus(m.id) === 'completed')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Episode Generation
            </CardTitle>
            <CardDescription>
              Generate AI-powered coaching episodes for each {memberLabel.toLowerCase()}
            </CardDescription>
          </div>

          <Button
            onClick={onGenerateAll}
            disabled={!canGenerate || isGenerating || allCompleted}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : allCompleted ? (
              <>
                <CheckCircle className="h-4 w-4" />
                All Generated
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {someCompleted ? 'Regenerate All' : 'Generate All Episodes'}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {teamMembers.map(member => {
            const status = getMemberStatus(member.id)
            const statusInfo = generationStatus[member.id]
            const existingEpisode = episodes.find(e =>
              coachingType === 'sales'
                ? e.producer_id === member.id
                : (e as any).csr_profile_id === member.id
            )

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{member.display_name}</p>
                    {existingEpisode && (
                      <p className="text-xs text-muted-foreground">
                        Generated {new Date(existingEpisode.updated_at || existingEpisode.created_at).toLocaleString()}
                        {existingEpisode.tokens_used && ` (${existingEpisode.tokens_used} tokens)`}
                      </p>
                    )}
                    {statusInfo?.error && (
                      <p className="text-xs text-destructive">{statusInfo.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}

                  <Badge
                    variant={status === 'completed' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}
                    className={status === 'completed' ? 'bg-green-500' : ''}
                  >
                    {status === 'generating' ? 'Generating...' :
                     status === 'completed' ? 'Ready' :
                     status === 'error' ? 'Failed' : 'Pending'}
                  </Badge>

                  {status !== 'generating' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onGenerateForMember(member.id)}
                      disabled={!canGenerate || isGenerating}
                    >
                      {status === 'completed' ? 'Regenerate' : 'Generate'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {!canGenerate && (
          <p className="mt-4 text-sm text-muted-foreground text-center">
            {coachingType === 'sales'
              ? 'Complete metrics and upload transcripts before generating episodes.'
              : 'Upload transcripts before generating episodes.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

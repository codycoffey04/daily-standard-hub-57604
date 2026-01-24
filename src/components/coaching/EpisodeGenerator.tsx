import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, CheckCircle, AlertCircle, User } from 'lucide-react'
import type { Database } from '@/integrations/supabase/types'

type Producer = Database['public']['Tables']['producers']['Row']
type CoachingEpisode = Database['public']['Tables']['coaching_episodes']['Row']

interface GenerationStatus {
  producerId: string
  status: 'idle' | 'generating' | 'completed' | 'error'
  error?: string
}

interface EpisodeGeneratorProps {
  producers: Producer[]
  episodes: CoachingEpisode[]
  generationStatus: Record<string, GenerationStatus>
  onGenerateAll: () => void
  onGenerateForProducer: (producerId: string) => void
  isGenerating: boolean
  canGenerate: boolean
}

export const EpisodeGenerator: React.FC<EpisodeGeneratorProps> = ({
  producers,
  episodes,
  generationStatus,
  onGenerateAll,
  onGenerateForProducer,
  isGenerating,
  canGenerate
}) => {
  const getProducerStatus = (producerId: string) => {
    const status = generationStatus[producerId]
    const existingEpisode = episodes.find(e => e.producer_id === producerId)

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

  const allCompleted = producers.every(p => getProducerStatus(p.id) === 'completed')
  const someCompleted = producers.some(p => getProducerStatus(p.id) === 'completed')

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
              Generate AI-powered coaching episodes for each producer
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
          {producers.map(producer => {
            const status = getProducerStatus(producer.id)
            const statusInfo = generationStatus[producer.id]
            const existingEpisode = episodes.find(e => e.producer_id === producer.id)

            return (
              <div
                key={producer.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{producer.display_name}</p>
                    {existingEpisode && (
                      <p className="text-xs text-muted-foreground">
                        Generated {new Date(existingEpisode.created_at).toLocaleString()}
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
                      onClick={() => onGenerateForProducer(producer.id)}
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
            Complete metrics and upload transcripts before generating episodes.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

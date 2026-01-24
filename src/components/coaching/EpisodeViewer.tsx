import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Copy, Download, Eye, Code, CheckCircle, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import ReactMarkdown from 'react-markdown'
import { ScoreBreakdown } from './ScoreBreakdown'
import type { Database } from '@/integrations/supabase/types'

type CoachingEpisode = Database['public']['Tables']['coaching_episodes']['Row']
type CoachingScore = Database['public']['Tables']['coaching_scores']['Row']
type Producer = Database['public']['Tables']['producers']['Row']

interface EpisodeViewerProps {
  producer: Producer
  episode: CoachingEpisode | null
  scores: CoachingScore[]
}

export const EpisodeViewer: React.FC<EpisodeViewerProps> = ({
  producer,
  episode,
  scores
}) => {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<'preview' | 'markdown'>('preview')

  if (!episode) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No episode generated for {producer.display_name} yet.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(episode.episode_content)
      toast({
        title: 'Copied',
        description: 'Episode markdown copied to clipboard'
      })
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive'
      })
    }
  }

  const handleDownload = () => {
    const blob = new Blob([episode.episode_content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${producer.display_name.toLowerCase()}-coaching-${episode.week_start}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Downloaded',
      description: 'Episode markdown file downloaded'
    })
  }

  const formatPremium = (premium: number | null): string => {
    if (!premium) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(premium)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>{producer.display_name}'s Coaching Episode</CardTitle>
              <CardDescription>
                Week of {episode.week_start} | Focus: {episode.focus_theme}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">{episode.status}</Badge>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Metrics Summary */}
        <div className="grid grid-cols-6 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">QHH</p>
            <p className="text-lg font-bold">{episode.qhh}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Quotes</p>
            <p className="text-lg font-bold">{episode.quotes}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Sales</p>
            <p className="text-lg font-bold">{episode.sales}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Items</p>
            <p className="text-lg font-bold">{episode.items}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Premium</p>
            <p className="text-lg font-bold">{formatPremium(episode.premium)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Close %</p>
            <p className="text-lg font-bold">{episode.close_rate}%</p>
          </div>
        </div>

        {/* Episode Content */}
        <Tabs defaultValue="episode" className="w-full">
          <TabsList>
            <TabsTrigger value="episode" className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              Episode
            </TabsTrigger>
            <TabsTrigger value="scores" className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Scores ({scores.length})
            </TabsTrigger>
            <TabsTrigger value="raw" className="flex items-center gap-1">
              <Code className="h-4 w-4" />
              Raw Markdown
            </TabsTrigger>
          </TabsList>

          <TabsContent value="episode" className="mt-4">
            <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-background border rounded-lg max-h-[600px] overflow-y-auto">
              <ReactMarkdown>{episode.episode_content}</ReactMarkdown>
            </div>
          </TabsContent>

          <TabsContent value="scores" className="mt-4">
            <ScoreBreakdown scores={scores} />
          </TabsContent>

          <TabsContent value="raw" className="mt-4">
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto max-h-[600px] overflow-y-auto whitespace-pre-wrap">
              {episode.episode_content}
            </pre>
          </TabsContent>
        </Tabs>

        {/* Generation Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
          <span>
            Generated {new Date(episode.created_at).toLocaleString()}
            {episode.model_used && ` using ${episode.model_used}`}
          </span>
          <span>
            {episode.tokens_used && `${episode.tokens_used} tokens`}
            {episode.generation_duration_ms && ` in ${(episode.generation_duration_ms / 1000).toFixed(1)}s`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

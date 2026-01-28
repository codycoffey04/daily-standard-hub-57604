import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Copy, Download, Eye, Code, CheckCircle, User, Headphones } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import ReactMarkdown from 'react-markdown'
import { ScoreBreakdown } from './ScoreBreakdown'
import type { Database } from '@/integrations/supabase/types'

type CoachingEpisode = Database['public']['Tables']['coaching_episodes']['Row']
type CoachingScore = Database['public']['Tables']['coaching_scores']['Row']
type CoachingType = 'sales' | 'service'

// Generic team member interface
interface TeamMember {
  id: string
  display_name: string
}

interface EpisodeViewerProps {
  producer: TeamMember
  episode: CoachingEpisode | null
  scores: CoachingScore[]
  coachingType?: CoachingType
}

export const EpisodeViewer: React.FC<EpisodeViewerProps> = ({
  producer,
  episode,
  scores,
  coachingType = 'sales'
}) => {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<'preview' | 'markdown'>('preview')

  const memberLabel = coachingType === 'service' ? 'CSR' : 'producer'

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

  const getNotebookLMPrompt = () => {
    if (coachingType === 'service') {
      return `This is a personalized weekly coaching session for a customer service representative named ${producer.display_name} at an insurance agency. The hosts should sound like supportive but direct team leads — encouraging but real. Focus on specific call examples and transcript quotes. Make it feel like a genuine coaching conversation about handling customers well, not a corporate training module. Keep the energy warm and appreciative. Acknowledge that service work is hard and that this person is valued.`
    }
    return `This is a personalized weekly sales coaching session for an insurance producer named ${producer.display_name}. The hosts should sound like supportive but direct sales coaches — encouraging but not soft. Focus on the specific call examples. Make it feel like a real coaching conversation, not a corporate training video. Keep the energy up.`
  }

  const handleCopyNotebookLMPrompt = async () => {
    try {
      await navigator.clipboard.writeText(getNotebookLMPrompt())
      toast({
        title: 'Copied',
        description: 'NotebookLM prompt copied to clipboard'
      })
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive'
      })
    }
  }

  const formatPremium = (premium: number | null): string => {
    if (!premium) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(premium)
  }

  // Check if metrics are available (only for sales mode)
  const hasMetrics = coachingType === 'sales' && (episode.qhh || episode.quotes || episode.sales)

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
        {/* Metrics Summary - Only for Sales Mode */}
        {hasMetrics && (
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
        )}

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
            <TabsTrigger value="notebooklm" className="flex items-center gap-1">
              <Headphones className="h-4 w-4" />
              NotebookLM
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
            <ScoreBreakdown scores={scores} coachingType={coachingType} />
          </TabsContent>

          <TabsContent value="notebooklm" className="mt-4">
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Headphones className="h-4 w-4" />
                  NotebookLM Audio Overview Settings
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Format</p>
                    <Badge variant="secondary" className="text-sm">Deep Dive</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Length</p>
                    <Badge variant="secondary" className="text-sm">Long</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Focus Prompt</p>
                    <Button variant="outline" size="sm" onClick={handleCopyNotebookLMPrompt}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Prompt
                    </Button>
                  </div>
                  <div className="p-3 bg-background border rounded-lg text-sm">
                    {getNotebookLMPrompt()}
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <h4 className="font-medium">How to Use</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Download the episode markdown using the button above</li>
                  <li>Go to <span className="font-mono text-foreground">notebooklm.google.com</span></li>
                  <li>Create a new notebook and upload the markdown file</li>
                  <li>Click "Audio Overview" → Customize</li>
                  <li>Set format to <strong>Deep Dive</strong> and length to <strong>Long</strong></li>
                  <li>Paste the focus prompt above into the customization field</li>
                  <li>Generate the audio</li>
                </ol>
              </div>
            </div>
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

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FileText, TrendingUp, TrendingDown, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/integrations/supabase/types'

type CoachingScore = Database['public']['Tables']['coaching_scores']['Row']

interface ScoreBreakdownProps {
  scores: CoachingScore[]
}

const STEP_LABELS: Record<string, string> = {
  step_1_opening: 'Opening',
  step_2_discovery: 'Discovery',
  step_3_quoting: 'Quoting',
  step_4_ask_for_sale: 'Ask for Sale',
  step_5_closing: 'Closing',
  step_6_follow_up: 'Follow-up',
  step_7_multi_line: 'Multi-Line',
  step_8_referral_ask: 'Referral Ask'
}

const SCORE_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Missed', color: 'bg-red-500' },
  1: { label: 'Partial', color: 'bg-yellow-500' },
  2: { label: 'Strong', color: 'bg-green-500' }
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ scores }) => {
  if (scores.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No scores available yet.</p>
      </div>
    )
  }

  // Calculate averages across all transcripts
  const stepKeys = Object.keys(STEP_LABELS) as Array<keyof typeof STEP_LABELS>
  const averages = stepKeys.reduce((acc, key) => {
    const values = scores
      .map(s => s[key as keyof CoachingScore] as number | null)
      .filter((v): v is number => v !== null)

    acc[key] = values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0
    return acc
  }, {} as Record<string, number>)

  const overallAverage = Object.values(averages).reduce((sum, v) => sum + v, 0) / stepKeys.length

  const getScoreBadge = (score: number | null) => {
    if (score === null) return <Badge variant="outline">N/A</Badge>
    const config = SCORE_LABELS[score] || SCORE_LABELS[0]
    return (
      <Badge className={cn(config.color, 'text-white')}>
        {config.label}
      </Badge>
    )
  }

  const getProgressBar = (value: number, max: number = 2) => {
    const percentage = (value / max) * 100
    return (
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={cn(
            'h-2 rounded-full transition-all',
            percentage >= 75 ? 'bg-green-500' :
            percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Overall Average</p>
                <p className="text-2xl font-bold">{overallAverage.toFixed(1)}/2</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Strongest Step</p>
                <p className="text-lg font-bold">
                  {STEP_LABELS[
                    Object.entries(averages).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
                  ] || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Needs Work</p>
                <p className="text-lg font-bold">
                  {STEP_LABELS[
                    Object.entries(averages).sort((a, b) => a[1] - b[1])[0]?.[0] || ''
                  ] || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step Averages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step Averages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stepKeys.map(key => (
              <div key={key} className="flex items-center gap-4">
                <span className="w-28 text-sm font-medium">{STEP_LABELS[key]}</span>
                <div className="flex-1">
                  {getProgressBar(averages[key])}
                </div>
                <span className="w-12 text-right text-sm font-medium">
                  {averages[key].toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual Transcript Scores */}
      <Accordion type="single" collapsible className="w-full">
        {scores.map((score, index) => (
          <AccordionItem key={score.id} value={score.id}>
            <AccordionTrigger>
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4" />
                <span>Transcript {index + 1}</span>
                <Badge variant="outline">{score.call_outcome || 'unknown'}</Badge>
                <span className="text-sm text-muted-foreground">
                  Score: {score.overall_score}/16
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {/* Step Scores Grid */}
                <div className="grid grid-cols-4 gap-2">
                  {stepKeys.map(key => {
                    const value = score[key as keyof CoachingScore] as number | null
                    return (
                      <div key={key} className="flex flex-col items-center p-2 bg-muted/50 rounded">
                        <span className="text-xs text-muted-foreground mb-1">
                          {STEP_LABELS[key]}
                        </span>
                        {getScoreBadge(value)}
                      </div>
                    )
                  })}
                </div>

                {/* Strengths */}
                {score.strengths && (score.strengths as Array<{ category: string; quote: string }>).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-green-600 mb-1">Strengths:</p>
                    <ul className="text-sm space-y-1">
                      {(score.strengths as Array<{ category: string; quote: string }>).map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-500">+</span>
                          <span>
                            <strong>{s.category}:</strong> "{s.quote}"
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvement Areas */}
                {score.improvement_areas && (score.improvement_areas as Array<{ category: string; suggestion: string }>).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-orange-600 mb-1">Improvement Areas:</p>
                    <ul className="text-sm space-y-1">
                      {(score.improvement_areas as Array<{ category: string; suggestion: string }>).map((area, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-orange-500">-</span>
                          <span>
                            <strong>{area.category}:</strong> {area.suggestion}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Cross-sell Triggers */}
                {score.cross_sell_triggers_detected && (score.cross_sell_triggers_detected as Array<{ trigger: string; pursued: boolean }>).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-1">Cross-Sell Triggers:</p>
                    <div className="flex flex-wrap gap-1">
                      {(score.cross_sell_triggers_detected as Array<{ trigger: string; pursued: boolean }>).map((t, i) => (
                        <Badge
                          key={i}
                          variant={t.pursued ? 'default' : 'outline'}
                          className={t.pursued ? 'bg-blue-500' : ''}
                        >
                          {t.trigger} {t.pursued ? '(pursued)' : '(missed)'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

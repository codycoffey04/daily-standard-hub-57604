import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FileText, TrendingUp, TrendingDown, Target, Star, MessageSquare, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/integrations/supabase/types'

type CoachingScore = Database['public']['Tables']['coaching_scores']['Row']
type CoachingType = 'sales' | 'service'

interface ScoreBreakdownProps {
  scores: CoachingScore[]
  coachingType?: CoachingType
}

// Sales coaching: 8-step scorecard
const SALES_STEP_LABELS: Record<string, string> = {
  step_1_opening: 'Opening',
  step_2_discovery: 'Discovery',
  step_3_quoting: 'Quoting',
  step_4_ask_for_sale: 'Ask for Sale',
  step_5_closing: 'Closing',
  step_6_follow_up: 'Follow-up',
  step_7_multi_line: 'Multi-Line',
  step_8_referral_ask: 'Referral Ask'
}

// Service coaching: 7-step scorecard
const SERVICE_STEP_LABELS: Record<string, string> = {
  step_1_greeting: 'Greeting & Tone',
  step_2_listening_empathy: 'Active Listening',
  step_3_problem_id: 'Problem ID',
  step_4_resolution: 'Resolution',
  step_5_cross_sell: 'Cross-Sell Opp',
  step_6_referral_ask_csr: 'Referral Ask',
  step_7_retention: 'Retention'
}

const SCORE_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Missed', color: 'bg-red-500' },
  1: { label: 'Partial', color: 'bg-yellow-500' },
  2: { label: 'Strong', color: 'bg-green-500' }
}

const CALL_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  service: { label: 'Service', color: 'bg-blue-500' },
  claims: { label: 'Claims', color: 'bg-orange-500' },
  billing: { label: 'Billing', color: 'bg-purple-500' },
  endorsement: { label: 'Endorsement', color: 'bg-teal-500' }
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ scores, coachingType = 'sales' }) => {
  if (scores.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No scores available yet.</p>
      </div>
    )
  }

  const STEP_LABELS = coachingType === 'service' ? SERVICE_STEP_LABELS : SALES_STEP_LABELS
  const maxPossibleScore = coachingType === 'service' ? 14 : 16 // 7 steps x 2 vs 8 steps x 2

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

  // Filter out steps with no data (like N/A for retention)
  const activeSteps = stepKeys.filter(key => {
    const values = scores.map(s => s[key as keyof CoachingScore] as number | null)
    return values.some(v => v !== null)
  })

  const overallAverage = activeSteps.length > 0
    ? activeSteps.reduce((sum, key) => sum + (averages[key] || 0), 0) / activeSteps.length
    : 0

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

  // Service-specific: calculate Google Review ask rate
  const googleReviewAskRate = coachingType === 'service'
    ? scores.filter(s => (s as any).google_review_ask === true).length / scores.length * 100
    : null

  // Service-specific: check for life insurance opportunities (Aleeah tracking)
  const lifeInsuranceOpps = coachingType === 'service'
    ? scores.filter(s => (s as any).life_insurance_opportunity === true)
    : []

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className={cn('grid gap-4', coachingType === 'service' ? 'grid-cols-4' : 'grid-cols-3')}>
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
                    Object.entries(averages)
                      .filter(([k]) => activeSteps.includes(k))
                      .sort((a, b) => b[1] - a[1])[0]?.[0] || ''
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
                    Object.entries(averages)
                      .filter(([k]) => activeSteps.includes(k))
                      .sort((a, b) => a[1] - b[1])[0]?.[0] || ''
                  ] || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service-specific: Google Review Rate */}
        {coachingType === 'service' && googleReviewAskRate !== null && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Review Ask Rate</p>
                  <p className="text-2xl font-bold">{googleReviewAskRate.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Life Insurance Opportunities (Aleeah tracking) */}
      {coachingType === 'service' && lifeInsuranceOpps.length > 0 && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              Life Insurance Opportunities Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lifeInsuranceOpps.map((score, i) => (
                <div key={i} className="text-sm">
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 mr-2">
                    Call {scores.indexOf(score) + 1}
                  </Badge>
                  {(score as any).life_insurance_context || 'Life insurance trigger detected'}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Averages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step Averages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stepKeys.map(key => {
              const hasData = activeSteps.includes(key)
              return (
                <div key={key} className={cn('flex items-center gap-4', !hasData && 'opacity-50')}>
                  <span className="w-28 text-sm font-medium">{STEP_LABELS[key]}</span>
                  <div className="flex-1">
                    {hasData ? getProgressBar(averages[key]) : (
                      <div className="w-full bg-muted rounded-full h-2" />
                    )}
                  </div>
                  <span className="w-12 text-right text-sm font-medium">
                    {hasData ? averages[key].toFixed(1) : 'N/A'}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Individual Transcript Scores */}
      <Accordion type="single" collapsible className="w-full">
        {scores.map((score, index) => {
          // Calculate actual max score for this transcript (excluding N/A steps)
          const applicableSteps = stepKeys.filter(key => {
            const value = score[key as keyof CoachingScore]
            return value !== null
          })
          const actualMaxScore = applicableSteps.length * 2

          return (
            <AccordionItem key={score.id} value={score.id}>
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4" />
                  <span>Transcript {index + 1}</span>

                  {/* Call Type Badge for Service Mode */}
                  {coachingType === 'service' && (score as any).call_type && (
                    <Badge className={cn(
                      CALL_TYPE_LABELS[(score as any).call_type]?.color || 'bg-gray-500',
                      'text-white'
                    )}>
                      {CALL_TYPE_LABELS[(score as any).call_type]?.label || (score as any).call_type}
                    </Badge>
                  )}

                  {/* Call Outcome Badge */}
                  <Badge variant="outline">{score.call_outcome || 'unknown'}</Badge>

                  {/* Google Review Badge for Service Mode */}
                  {coachingType === 'service' && (score as any).google_review_ask && (
                    <Badge className="bg-yellow-500 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Review Asked
                    </Badge>
                  )}

                  <span className="text-sm text-muted-foreground">
                    Score: {score.overall_score}/{actualMaxScore}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {/* Step Scores Grid */}
                  <div className={cn('grid gap-2', coachingType === 'service' ? 'grid-cols-4' : 'grid-cols-4')}>
                    {stepKeys.map(key => {
                      const value = score[key as keyof CoachingScore] as number | null
                      return (
                        <div key={key} className="flex flex-col items-center p-2 bg-muted/50 rounded">
                          <span className="text-xs text-muted-foreground mb-1 text-center">
                            {STEP_LABELS[key]}
                          </span>
                          {getScoreBadge(value)}
                        </div>
                      )
                    })}
                  </div>

                  {/* Life Insurance Context for Service Mode */}
                  {coachingType === 'service' && (score as any).life_insurance_opportunity && (
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm font-medium text-purple-700 mb-1 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Life Insurance Opportunity
                      </p>
                      <p className="text-sm text-purple-600">
                        {(score as any).life_insurance_context || 'Life insurance trigger detected on this call'}
                      </p>
                    </div>
                  )}

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
          )
        })}
      </Accordion>
    </div>
  )
}

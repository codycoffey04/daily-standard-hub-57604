import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, TrendingUp, TrendingDown, Target, Star, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useCoachingDashboardCard,
  findStrongestWeakest,
  SALES_STEP_NAMES,
  SERVICE_STEP_NAMES
} from '@/hooks/useCoachingDashboardCard'

type CoachingType = 'sales' | 'service'

interface CoachingDashboardCardProps {
  memberId: string
  memberName: string
  coachingType: CoachingType
  isCsr?: boolean
}

export const CoachingDashboardCard: React.FC<CoachingDashboardCardProps> = ({
  memberId,
  memberName,
  coachingType,
  isCsr = false
}) => {
  const { data, isLoading, error } = useCoachingDashboardCard(memberId, coachingType, isCsr)

  // Don't render if no current week episode
  if (!isLoading && !data?.current_week) {
    return null
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    )
  }

  // Error state - just don't render
  if (error || !data?.current_week) {
    return null
  }

  const { current_week, previous_week, delta } = data
  const stepNames = coachingType === 'sales' ? SALES_STEP_NAMES : SERVICE_STEP_NAMES
  const stepKeys = Object.keys(stepNames)

  const { strongest, weakest } = findStrongestWeakest(current_week.step_averages)

  // Format week date for display
  const formatWeekDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Get progress bar color
  const getBarColor = (score: number): string => {
    const percentage = (score / 2) * 100
    if (percentage >= 75) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // Get delta indicator
  const getDeltaDisplay = () => {
    if (!delta || delta.overall === 0) return null

    const isPositive = delta.overall > 0
    const Icon = isPositive ? ArrowUp : ArrowDown
    const colorClass = isPositive ? 'text-green-600' : 'text-red-500'

    return (
      <span className={cn('flex items-center text-sm font-medium', colorClass)}>
        <Icon className="h-3 w-3 mr-0.5" />
        {Math.abs(delta.overall).toFixed(1)}
      </span>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-base">
            <BarChart3 className="h-4 w-4" />
            <span>Coaching Scorecard</span>
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Week of {formatWeekDate(current_week.week_start)} &bull; {current_week.focus_theme}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Average */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Overall Average</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">{current_week.overall_avg.toFixed(1)}/2</span>
            {getDeltaDisplay()}
          </div>
        </div>

        {/* Strongest & Weakest */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border-l-4 border-l-green-500">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Strongest</p>
              <p className="text-sm font-medium">{stepNames[strongest.step] || '-'}</p>
              <p className="text-xs text-green-500">{strongest.score.toFixed(1)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border-l-4 border-l-red-500">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-xs text-muted-foreground">Needs Work</p>
              <p className="text-sm font-medium">{stepNames[weakest.step] || '-'}</p>
              <p className="text-xs text-red-500">{weakest.score.toFixed(1)}</p>
            </div>
          </div>
        </div>

        {/* Google Review Rate (Service only) */}
        {coachingType === 'service' && current_week.google_review_ask_rate !== undefined && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted border-l-4 border-l-yellow-500">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Review Ask Rate</span>
            </div>
            <span className="text-lg font-bold">{current_week.google_review_ask_rate}%</span>
          </div>
        )}

        {/* Step Averages - scrollable if needed */}
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Step Averages</p>
          {stepKeys.map(key => {
            const score = current_week.step_averages[key] ?? 0
            const percentage = (score / 2) * 100

            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-24 text-xs font-medium truncate">{stepNames[key]}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', getBarColor(score))}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-medium">{score.toFixed(1)}</span>
              </div>
            )
          })}
        </div>

        {/* Focus Challenge */}
        {current_week.focus_challenge && (
          <div className="p-3 rounded-lg bg-muted border-l-4 border-l-blue-500">
            <p className="text-xs font-medium text-blue-500 mb-1">Focus This Week</p>
            <p className="text-sm">{current_week.focus_challenge}</p>
          </div>
        )}

        {/* Transcript count */}
        <p className="text-xs text-muted-foreground text-center">
          Based on {current_week.transcript_count} scored call{current_week.transcript_count !== 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  )
}

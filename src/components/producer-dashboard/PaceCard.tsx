import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProducerDashboardPace, ProducerDashboardVCCountdown } from '@/hooks/useProducerDashboard'

interface PaceCardProps {
  pace: ProducerDashboardPace
  vcCountdown: ProducerDashboardVCCountdown
}

export const PaceCard: React.FC<PaceCardProps> = ({ pace, vcCountdown }) => {
  const progressPct = Math.min(100, (pace.current_items / pace.personal_goal) * 100)

  const getProgressColor = (): string => {
    if (pace.on_pace) return 'bg-success'
    if (progressPct >= 50) return 'bg-warning'
    return 'bg-destructive'
  }

  const getAgencyProgressColor = (): string => {
    const agencyPct = (vcCountdown.agency_current / vcCountdown.agency_target) * 100
    if (agencyPct >= 80) return 'bg-success'
    if (agencyPct >= 60) return 'bg-warning'
    return 'bg-destructive'
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-base">
          <Target className="h-4 w-4" />
          <span>Pace to Goal</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Personal Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Your Progress</span>
            <span className={cn(
              'font-semibold',
              pace.on_pace ? 'text-success' : 'text-destructive'
            )}>
              {pace.current_items} / {pace.personal_goal}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className={cn('rounded-full h-3 transition-all', getProgressColor())}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            {pace.on_pace ? (
              <>
                <TrendingUp className="h-3 w-3 mr-1 text-success" />
                <span className="text-success">On pace!</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3 mr-1 text-destructive" />
                <span>
                  Need <span className="font-semibold text-foreground">{pace.items_per_day_needed}</span> items/day
                </span>
              </>
            )}
            <span className="mx-1">•</span>
            <span>{pace.workdays_remaining} days left</span>
          </div>
        </div>

        {/* Agency VC Progress */}
        <div className="pt-3 border-t space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Agency VC</span>
            <span className="font-semibold">
              {vcCountdown.agency_current} / {vcCountdown.agency_target}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={cn('rounded-full h-2 transition-all', getAgencyProgressColor())}
              style={{ width: `${Math.min(100, (vcCountdown.agency_current / vcCountdown.agency_target) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">{vcCountdown.agency_gap} to go • {vcCountdown.days_remaining} days</span>
            <div className="flex items-center space-x-1 bg-primary/10 px-2 py-1 rounded-full">
              <span className="text-primary font-semibold">
                {vcCountdown.producer_contribution_pct}%
              </span>
              <span className="text-muted-foreground">your share</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

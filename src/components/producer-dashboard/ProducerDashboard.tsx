import React from 'react'
import { useProducerDashboard } from '@/hooks/useProducerDashboard'
import { ScorecardCard } from './ScorecardCard'
import { TeamStandingsCard } from './TeamStandingsCard'
import { PaceCard } from './PaceCard'
import { StreakCard } from './StreakCard'
import { AlertsCard } from '@/components/patterns/AlertsCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface ProducerDashboardProps {
  producerId: string | null | undefined
}

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-4">
    {/* Scorecard skeleton */}
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center p-3 bg-muted/50 rounded-lg">
              <Skeleton className="h-8 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Team standings skeleton */}
    <Card>
      <CardContent className="pt-6 space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </CardContent>
    </Card>

    {/* Pace skeleton */}
    <Card>
      <CardContent className="pt-6 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  </div>
)

export const ProducerDashboard: React.FC<ProducerDashboardProps> = ({ producerId }) => {
  const { data, isLoading, error, refetch } = useProducerDashboard(producerId)

  // Expose refetch for parent components
  React.useEffect(() => {
    // This allows the parent to trigger a refetch after form submission
    const handleRefetch = () => {
      refetch()
    }
    window.addEventListener('producer-dashboard-refresh', handleRefetch)
    return () => {
      window.removeEventListener('producer-dashboard-refresh', handleRefetch)
    }
  }, [refetch])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Failed to load dashboard</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No dashboard data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Hot streak alert at top when active */}
      {data.streaks.is_hot && (
        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-4 animate-pulse">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl">🔥</span>
            <span className="font-bold text-orange-600 dark:text-orange-400">
              YOU'RE ON FIRE!
            </span>
            <span className="text-2xl">🔥</span>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-1">
            {data.streaks.recent_items_3d} items in 3 days • {data.streaks.velocity_vs_avg}x your usual pace
          </p>
        </div>
      )}

      {/* Pattern Alerts - only renders if patterns exist */}
      <AlertsCard producerId={producerId} />

      {/* Scorecard */}
      <ScorecardCard scorecard={data.scorecard} />

      {/* Team Standings */}
      <TeamStandingsCard teamStandings={data.team_standings} />

      {/* Pace to Goal + VC Countdown */}
      <PaceCard pace={data.pace} vcCountdown={data.vc_countdown} />

      {/* Win Streak (without hot streak since it's shown at top) */}
      {!data.streaks.is_hot && <StreakCard streaks={data.streaks} />}
    </div>
  )
}

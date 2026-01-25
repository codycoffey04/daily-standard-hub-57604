import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProducerDashboardTeamStandings } from '@/hooks/useProducerDashboard'

interface TeamStandingsCardProps {
  teamStandings: ProducerDashboardTeamStandings
}

export const TeamStandingsCard: React.FC<TeamStandingsCardProps> = ({ teamStandings }) => {
  const getRankStyle = (rank: number, isMe: boolean): string => {
    if (isMe) {
      return 'bg-primary/20 border-primary/30 border'
    }
    if (rank === 1) {
      return 'bg-yellow-500/10'
    }
    return 'bg-muted/30'
  }

  // Close rate color: agency avg is ~25%, so:
  // >= 30% = excellent (green)
  // >= 22% = good (default)
  // < 22% = needs attention (yellow/red)
  const getCloseRateColor = (rate: number): string => {
    if (rate >= 30) return 'text-success'
    if (rate >= 22) return 'text-foreground'
    if (rate >= 15) return 'text-warning'
    return 'text-destructive'
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-base">
          <Users className="h-4 w-4" />
          <span>Team Standings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Header row */}
        <div className="flex items-center justify-between px-3 py-1 text-xs text-muted-foreground">
          <span className="w-24">Producer</span>
          <div className="flex items-center space-x-4">
            <span className="w-14 text-right">Items</span>
            <span className="w-14 text-right">Close %</span>
          </div>
        </div>

        {teamStandings.standings.map((standing) => (
          <div
            key={standing.producer_id}
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
              getRankStyle(standing.rank, standing.is_me)
            )}
          >
            <div className="flex items-center space-x-2 w-24">
              <span className={cn(
                'w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0',
                standing.rank === 1 ? 'bg-yellow-500/20 text-yellow-600' :
                standing.rank === 2 ? 'bg-gray-400/20 text-gray-500' :
                standing.rank === 3 ? 'bg-orange-500/20 text-orange-600' :
                'bg-muted text-muted-foreground'
              )}>
                {standing.rank}
              </span>
              <span className={cn(
                'text-sm truncate',
                standing.is_me ? 'font-semibold text-foreground' : 'text-muted-foreground'
              )}>
                {standing.is_me ? 'You' : standing.producer_name.split(' ')[0]}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className={cn(
                'text-sm tabular-nums w-14 text-right',
                standing.is_me ? 'font-bold text-foreground' : 'text-muted-foreground'
              )}>
                {standing.items}
              </span>
              <span className={cn(
                'text-sm tabular-nums w-14 text-right font-medium',
                getCloseRateColor(standing.close_rate)
              )}>
                {standing.close_rate}%
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

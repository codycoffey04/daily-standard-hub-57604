import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProducerDashboardTeamStandings } from '@/hooks/useProducerDashboard'

interface TeamStandingsCardProps {
  teamStandings: ProducerDashboardTeamStandings
}

export const TeamStandingsCard: React.FC<TeamStandingsCardProps> = ({ teamStandings }) => {
  const getRankEmoji = (rank: number): string => {
    switch (rank) {
      case 1:
        return '1'
      case 2:
        return '2'
      case 3:
        return '3'
      default:
        return `${rank}`
    }
  }

  const getRankStyle = (rank: number, isMe: boolean): string => {
    if (isMe) {
      return 'bg-primary/20 border-primary/30 border'
    }
    if (rank === 1) {
      return 'bg-yellow-500/10'
    }
    return 'bg-muted/30'
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
        {teamStandings.standings.map((standing) => (
          <div
            key={standing.producer_id}
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
              getRankStyle(standing.rank, standing.is_me)
            )}
          >
            <div className="flex items-center space-x-3">
              <span className={cn(
                'w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold',
                standing.rank === 1 ? 'bg-yellow-500/20 text-yellow-600' :
                standing.rank === 2 ? 'bg-gray-400/20 text-gray-500' :
                standing.rank === 3 ? 'bg-orange-500/20 text-orange-600' :
                'bg-muted text-muted-foreground'
              )}>
                {getRankEmoji(standing.rank)}
              </span>
              <span className={cn(
                'text-sm',
                standing.is_me ? 'font-semibold text-foreground' : 'text-muted-foreground'
              )}>
                {standing.is_me ? 'You' : standing.producer_name.split(' ')[0]}
              </span>
            </div>
            <span className={cn(
              'text-sm tabular-nums',
              standing.is_me ? 'font-bold text-foreground' : 'text-muted-foreground'
            )}>
              {standing.items} items
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

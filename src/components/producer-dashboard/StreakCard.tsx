import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flame, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProducerDashboardStreaks } from '@/hooks/useProducerDashboard'

interface StreakCardProps {
  streaks: ProducerDashboardStreaks
}

export const StreakCard: React.FC<StreakCardProps> = ({ streaks }) => {
  // Fire emojis scale: 3+ = 1, 5+ = 2, 7+ = 3
  const getFireEmojis = (streak: number): string => {
    if (streak >= 7) return '🔥🔥🔥'
    if (streak >= 5) return '🔥🔥'
    if (streak >= 3) return '🔥'
    return ''
  }

  const getStreakColor = (streak: number): string => {
    if (streak >= 7) return 'text-orange-500'
    if (streak >= 5) return 'text-yellow-500'
    if (streak >= 3) return 'text-yellow-600'
    return 'text-muted-foreground'
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-base">
          <Flame className="h-4 w-4" />
          <span>Streaks</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Win Streak */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className={cn('h-4 w-4', getStreakColor(streaks.win_streak))} />
            <span className="text-sm text-muted-foreground">TOP Streak</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className={cn('font-bold', getStreakColor(streaks.win_streak))}>
              {streaks.win_streak} {streaks.win_streak === 1 ? 'day' : 'days'}
            </span>
            {getFireEmojis(streaks.win_streak) && (
              <span className="text-base">{getFireEmojis(streaks.win_streak)}</span>
            )}
          </div>
        </div>

        {/* Hot Streak Alert */}
        {streaks.is_hot && (
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🔥</span>
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  HOT STREAK!
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {streaks.recent_items_3d} items in 3 days
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {streaks.velocity_vs_avg}x your usual pace
            </p>
          </div>
        )}

        {/* No hot streak - show recent activity */}
        {!streaks.is_hot && (
          <div className="text-xs text-muted-foreground">
            Recent: {streaks.recent_items_3d} items in last 3 days
            {streaks.velocity_vs_avg > 0 && (
              <span className="ml-1">({streaks.velocity_vs_avg}x avg)</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

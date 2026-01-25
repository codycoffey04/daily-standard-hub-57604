import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flame, Zap, TrendingUp } from 'lucide-react'
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

  // Hot streak: 5+ items in 3 days OR velocity > 1.5x average
  const isHot = streaks.recent_items_3d >= 5 ||
    (streaks.avg_items_per_day > 0 && (streaks.recent_items_3d / 3) > (streaks.avg_items_per_day * 1.5))

  const velocityVsAvg = streaks.avg_items_per_day > 0
    ? ((streaks.recent_items_3d / 3) / streaks.avg_items_per_day).toFixed(1)
    : '0'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-base">
          <Flame className="h-4 w-4" />
          <span>Streaks</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Framework Streak */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className={cn('h-4 w-4', getStreakColor(streaks.framework_streak))} />
            <span className="text-sm text-muted-foreground">Framework Streak</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className={cn('font-bold', getStreakColor(streaks.framework_streak))}>
              {streaks.framework_streak} {streaks.framework_streak === 1 ? 'day' : 'days'}
            </span>
            {getFireEmojis(streaks.framework_streak) && (
              <span className="text-base">{getFireEmojis(streaks.framework_streak)}</span>
            )}
          </div>
        </div>

        {/* Hot Streak */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className={cn('h-4 w-4', isHot ? 'text-orange-500' : 'text-muted-foreground')} />
            <span className="text-sm text-muted-foreground">Hot Streak</span>
          </div>
          <span className={cn('font-bold', isHot ? 'text-orange-500' : 'text-muted-foreground')}>
            {streaks.recent_items_3d} items (3d)
          </span>
        </div>

        {/* Hot Streak Alert Banner */}
        {isHot && (
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🔥</span>
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  HOT STREAK!
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {velocityVsAvg}x your usual pace
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

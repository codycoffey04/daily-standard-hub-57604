import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WeekSelectorProps {
  selectedWeekStart: Date
  onWeekChange: (weekStart: Date) => void
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  selectedWeekStart,
  onWeekChange
}) => {
  const getMonday = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - (day === 0 ? 6 : day - 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const currentWeekMonday = getMonday(new Date())

  const goToPreviousWeek = () => {
    const prevWeek = new Date(selectedWeekStart)
    prevWeek.setDate(prevWeek.getDate() - 7)
    onWeekChange(prevWeek)
  }

  const goToNextWeek = () => {
    const nextWeek = new Date(selectedWeekStart)
    nextWeek.setDate(nextWeek.getDate() + 7)
    onWeekChange(nextWeek)
  }

  const goToCurrentWeek = () => {
    onWeekChange(currentWeekMonday)
  }

  const goToLastWeek = () => {
    const lastWeek = new Date(currentWeekMonday)
    lastWeek.setDate(lastWeek.getDate() - 7)
    onWeekChange(lastWeek)
  }

  const isCurrentWeek = selectedWeekStart.getTime() === currentWeekMonday.getTime()
  const isLastWeek = selectedWeekStart.getTime() === (currentWeekMonday.getTime() - 7 * 24 * 60 * 60 * 1000)

  const formatWeekLabel = (monday: Date): string => {
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${monday.toLocaleDateString('en-US', options)} - ${sunday.toLocaleDateString('en-US', options)}`
  }

  // Calculate focus week number (1-8 rotation starting 2026-01-06)
  const getFocusWeekNumber = (weekStart: Date): number => {
    const cycleStart = new Date('2026-01-06')
    const msPerWeek = 7 * 24 * 60 * 60 * 1000
    const weeksSinceStart = Math.floor((weekStart.getTime() - cycleStart.getTime()) / msPerWeek)
    return ((weeksSinceStart % 8) + 8) % 8 + 1 // Handle negative numbers properly
  }

  const focusWeekNumber = getFocusWeekNumber(selectedWeekStart)

  const focusThemes: Record<number, string> = {
    1: 'Discovery & Needs Assessment',
    2: 'Bundling & Multi-Line',
    3: 'Asking for the Sale',
    4: 'Referral Generation',
    5: 'Objection Handling',
    6: 'Quote Volume & Activity',
    7: 'Cross-Sell Triggers',
    8: 'Value Before Price'
  }

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToLastWeek}
            className={cn(isLastWeek && 'bg-accent')}
          >
            Last Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToCurrentWeek}
            className={cn(isCurrentWeek && 'bg-accent')}
          >
            This Week
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[180px] text-center font-medium">
            {formatWeekLabel(selectedWeekStart)}
          </span>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Focus Theme Display */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Focus Week:</span>
          <span className="font-medium">Week {focusWeekNumber}</span>
        </div>
        <div className="text-sm font-medium text-primary">
          {focusThemes[focusWeekNumber]}
        </div>
      </div>
    </div>
  )
}

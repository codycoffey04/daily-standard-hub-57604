import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PeriodType } from '@/hooks/useEmailMetrics'

interface PeriodSelectorProps {
  periodType: PeriodType
  selectedPeriodStart: Date
  onPeriodTypeChange: (type: PeriodType) => void
  onPeriodChange: (start: Date) => void
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  periodType,
  selectedPeriodStart,
  onPeriodTypeChange,
  onPeriodChange
}) => {
  const getMonday = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - (day === 0 ? 6 : day - 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const getFirstOfMonth = (date: Date): Date => {
    const d = new Date(date)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const currentWeekMonday = getMonday(new Date())
  const currentMonthFirst = getFirstOfMonth(new Date())

  const goToPrevious = () => {
    const prev = new Date(selectedPeriodStart)
    if (periodType === 'weekly') {
      prev.setDate(prev.getDate() - 7)
    } else {
      prev.setMonth(prev.getMonth() - 1)
    }
    onPeriodChange(prev)
  }

  const goToNext = () => {
    const next = new Date(selectedPeriodStart)
    if (periodType === 'weekly') {
      next.setDate(next.getDate() + 7)
    } else {
      next.setMonth(next.getMonth() + 1)
    }
    onPeriodChange(next)
  }

  const goToCurrent = () => {
    if (periodType === 'weekly') {
      onPeriodChange(currentWeekMonday)
    } else {
      onPeriodChange(currentMonthFirst)
    }
  }

  const goToLast = () => {
    if (periodType === 'weekly') {
      const lastWeek = new Date(currentWeekMonday)
      lastWeek.setDate(lastWeek.getDate() - 7)
      onPeriodChange(lastWeek)
    } else {
      const lastMonth = new Date(currentMonthFirst)
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      onPeriodChange(lastMonth)
    }
  }

  const handlePeriodTypeChange = (type: PeriodType) => {
    onPeriodTypeChange(type)
    // Reset to appropriate current period
    if (type === 'weekly') {
      onPeriodChange(currentWeekMonday)
    } else {
      onPeriodChange(currentMonthFirst)
    }
  }

  const isCurrent = periodType === 'weekly'
    ? selectedPeriodStart.getTime() === currentWeekMonday.getTime()
    : selectedPeriodStart.getTime() === currentMonthFirst.getTime()

  const isLast = periodType === 'weekly'
    ? selectedPeriodStart.getTime() === (currentWeekMonday.getTime() - 7 * 24 * 60 * 60 * 1000)
    : selectedPeriodStart.getMonth() === new Date(currentMonthFirst.getFullYear(), currentMonthFirst.getMonth() - 1, 1).getMonth()
      && selectedPeriodStart.getFullYear() === new Date(currentMonthFirst.getFullYear(), currentMonthFirst.getMonth() - 1, 1).getFullYear()

  const formatLabel = (): string => {
    if (periodType === 'weekly') {
      const sunday = new Date(selectedPeriodStart)
      sunday.setDate(selectedPeriodStart.getDate() + 6)
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
      return `${selectedPeriodStart.toLocaleDateString('en-US', options)} - ${sunday.toLocaleDateString('en-US', options)}`
    } else {
      return selectedPeriodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Period Type Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
          <Button
            variant={periodType === 'weekly' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handlePeriodTypeChange('weekly')}
          >
            Weekly
          </Button>
          <Button
            variant={periodType === 'monthly' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handlePeriodTypeChange('monthly')}
          >
            Monthly
          </Button>
        </div>

        {/* Quick Navigation */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToLast}
            className={cn(isLast && 'bg-accent')}
          >
            {periodType === 'weekly' ? 'Last Week' : 'Last Month'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToCurrent}
            className={cn(isCurrent && 'bg-accent')}
          >
            {periodType === 'weekly' ? 'This Week' : 'This Month'}
          </Button>
        </div>
      </div>

      {/* Period Navigation */}
      <div className="flex items-center justify-center space-x-4">
        <Button variant="outline" size="icon" onClick={goToPrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[200px] text-center text-lg font-semibold">
          {formatLabel()}
        </span>
        <Button variant="outline" size="icon" onClick={goToNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

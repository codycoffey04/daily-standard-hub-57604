import React, { useMemo } from 'react'
import { CoachingEffectivenessCardSimple } from '@/components/insights/CoachingEffectivenessCardSimple'
import { ReviewsEmptyState } from '@/components/ui/reviews-empty-state'
import { useCoachingEffectivenessSimple } from '@/hooks/useAnalyticsData'
import { Skeleton } from '@/components/ui/skeleton'

interface CoachingEffectivenessReportProps {
  selectedYear: number
  selectedMonth: number | null
}

export const CoachingEffectivenessReport: React.FC<CoachingEffectivenessReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  const dateRange = useMemo(() => {
    const startDate = selectedMonth !== null
      ? new Date(selectedYear, selectedMonth - 1, 1)
      : new Date(selectedYear, 0, 1)
    
    const endDate = selectedMonth !== null
      ? new Date(selectedYear, selectedMonth, 0)
      : new Date(selectedYear, 11, 31)
    
    return { from: startDate, to: endDate }
  }, [selectedYear, selectedMonth])

  const { data, isLoading } = useCoachingEffectivenessSimple(dateRange)

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (!data || data.total_issues === 0) {
    return <ReviewsEmptyState />
  }

  return <CoachingEffectivenessCardSimple dateRange={dateRange} />
}

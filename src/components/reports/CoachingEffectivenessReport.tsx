import React, { useMemo } from 'react'
import { CoachingEffectivenessDashboard } from '@/components/CoachingEffectivenessDashboard'

interface CoachingEffectivenessReportProps {
  selectedYear: number
  selectedMonth: number | null
}

export const CoachingEffectivenessReport: React.FC<CoachingEffectivenessReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  const timeframe = useMemo(() => {
    const now = new Date()
    
    // Calculate start date
    const startDate = selectedMonth !== null
      ? new Date(selectedYear, selectedMonth - 1, 1)
      : new Date(selectedYear, 0, 1)
    
    // Calculate end date
    let endDate = selectedMonth !== null
      ? new Date(selectedYear, selectedMonth, 0) // Last day of selected month
      : new Date(selectedYear, 11, 31) // Last day of year
    
    // If end date is in the future, use current date instead
    if (endDate > now) {
      endDate = now
    }
    
    // If start date is in the future, return default
    if (startDate > now) {
      return 30
    }
    
    // Calculate days difference
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Return at least 1 day
    return Math.max(1, daysDiff)
  }, [selectedYear, selectedMonth])

  return (
    <CoachingEffectivenessDashboard 
      initialTimeframe={timeframe}
      hideTimeframeSelector={true}
    />
  )
}

import React, { useMemo, useCallback, useRef, useEffect } from 'react'
import { CoachingEffectivenessDashboard } from '@/components/CoachingEffectivenessDashboard'
import { useCoachingEffectivenessDashboard } from '@/hooks/useCoachingEffectivenessDashboard'

interface CoachingEffectivenessReportProps {
  selectedYear: number
  selectedMonth: number | null
  onExportReady?: (exportFn: () => void) => void
}

export const CoachingEffectivenessReport: React.FC<CoachingEffectivenessReportProps> = ({
  selectedYear,
  selectedMonth,
  onExportReady
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

  // Fetch data for export
  const { data } = useCoachingEffectivenessDashboard(timeframe)
  const producerProgress = useMemo(() => data?.producer_progress ?? [], [data])

  // Export CSV - hooks must be called unconditionally
  const exportToCSV = useCallback(() => {
    if (producerProgress.length === 0) return

    const headers = ['Producer', 'Coaching Sessions', 'Gaps Identified', 'Gaps Addressed', 'Improvement Rate', 'Status']
    const csvRows = producerProgress.map(p => [
      `"${p.producer_name}"`,
      p.coaching_sessions.toString(),
      p.gaps_identified.toString(),
      p.gaps_addressed.toString(),
      p.improvement_rate.toFixed(1),
      p.status
    ])

    const csvContent = [headers, ...csvRows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const monthStr = selectedMonth ? `_${selectedMonth.toString().padStart(2, '0')}` : ''
    link.download = `coaching_effectiveness_${selectedYear}${monthStr}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }, [producerProgress, selectedYear, selectedMonth])

  const exportRef = useRef(exportToCSV)
  exportRef.current = exportToCSV

  const stableWrapperRef = useRef<(() => void) | null>(null)
  if (!stableWrapperRef.current) {
    stableWrapperRef.current = () => exportRef.current()
  }

  useEffect(() => {
    onExportReady?.(stableWrapperRef.current!)
  }, [onExportReady])

  return (
    <CoachingEffectivenessDashboard 
      initialTimeframe={timeframe}
      hideTimeframeSelector={true}
    />
  )
}

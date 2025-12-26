import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryBarChart } from '@/components/charts/SummaryBarChart'
import { useQHHBySource } from '@/hooks/useSummariesData'
import { useMonthlySummary } from '@/hooks/useMonthlySummary'
import { ChartLoading } from '@/components/ui/chart-loading'
import { EmptyState } from '@/components/ui/empty-state'
import { formatNumber } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'
import { MonthlyTotalsCard } from '@/components/MonthlyTotalsCard'

interface QHHBySourceReportProps {
  selectedYear: number
  selectedMonth: number | null
  onExportReady?: (exportFn: (() => void) | null) => void
}

export const QHHBySourceReport: React.FC<QHHBySourceReportProps> = ({
  selectedYear,
  selectedMonth,
  onExportReady
}) => {
  console.log('🎯 === QHHBySourceReport RENDERING ===')
  console.log('  Props - selectedYear:', selectedYear, 'selectedMonth:', selectedMonth)
  
  const { data, isLoading, error } = useQHHBySource(selectedYear, selectedMonth)
  const { data: monthlySummary, isLoading: isSummaryLoading } = useMonthlySummary(selectedYear, selectedMonth)
  
  console.log('  Hook returned - isLoading:', isLoading, 'hasData:', !!data, 'hasError:', !!error)
  if (data) console.log('  Data rows:', data.length)

  if (isLoading || isSummaryLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <ChartLoading />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div className="text-lg font-medium text-foreground">
              Error loading data
            </div>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Filter out sources with 0 QHH
  const activeSources = data?.filter(item => item.qhh > 0) || []
  
  const chartData = activeSources.map(item => ({
    name: item.source_name,
    value: item.qhh
  }))

  const totalQHH = monthlySummary?.total_qhh || 0

  // Export to CSV function
  const exportToCSV = React.useCallback(() => {
    if (!activeSources || activeSources.length === 0) {
      console.warn('No data to export')
      return
    }

    const escapeCSV = (value: string | number): string => {
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const headers = ['Source Name', 'QHH']
    const csvRows = activeSources.map(item => [
      escapeCSV(item.source_name),
      escapeCSV(item.qhh)
    ])

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const monthStr = selectedMonth ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}` : `${selectedYear}`
    link.download = `qhh-by-source_${monthStr}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }, [activeSources, selectedYear, selectedMonth])

  // Store export function in ref and create stable wrapper
  const exportToCSVRef = React.useRef(exportToCSV)
  exportToCSVRef.current = exportToCSV
  const stableExportWrapperRef = React.useRef<(() => void) | null>(null)
  if (!stableExportWrapperRef.current) {
    stableExportWrapperRef.current = () => {
      exportToCSVRef.current()
    }
  }

  // Register export function ONCE on mount
  React.useEffect(() => {
    if (onExportReady && stableExportWrapperRef.current) {
      onExportReady(stableExportWrapperRef.current)
    }
    return () => {
      if (onExportReady) {
        onExportReady(null)
      }
    }
  }, [onExportReady])

  return (
    <div className="space-y-6">
      <MonthlyTotalsCard selectedYear={selectedYear} selectedMonth={selectedMonth} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total QHH</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalQHH)}</div>
            <p className="text-xs text-muted-foreground">
              Across all sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeSources?.[0]?.source_name || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(activeSources?.[0]?.qhh || 0)} QHH
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSources.length}</div>
            <p className="text-xs text-muted-foreground">
              Sources generating QHH
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quoted Households by Source</CardTitle>
          <p className="text-sm text-muted-foreground">
            Distribution of quoted households across all lead sources
          </p>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <SummaryBarChart
              data={chartData}
              title="QHH"
              height={450}
              color="hsl(var(--primary))"
            />
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
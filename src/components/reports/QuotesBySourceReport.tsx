import React, { useCallback, useRef, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryBarChart } from '@/components/charts/SummaryBarChart'
import { useQuotesBySource } from '@/hooks/useSummariesData'
import { ChartLoading } from '@/components/ui/chart-loading'
import { EmptyState } from '@/components/ui/empty-state'
import { formatNumber } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface QuotesBySourceReportProps {
  selectedYear: number
  selectedMonth: number | null
  onExportReady?: (exportFn: (() => void) | null) => void
}

export const QuotesBySourceReport: React.FC<QuotesBySourceReportProps> = ({
  selectedYear,
  selectedMonth,
  onExportReady
}) => {
  const { data, isLoading, error } = useQuotesBySource(selectedYear, selectedMonth)

  // Derive data safely even when data is undefined
  const rows = useMemo(() => data ?? [], [data])

  const chartData = useMemo(() => rows.map(item => ({
    name: item.source_name,
    value: item.quotes
  })), [rows])

  const totalQuotes = useMemo(() => rows.reduce((sum, item) => sum + item.quotes, 0), [rows])

  // Export to CSV function - all hooks MUST be called before any early returns
  const exportToCSV = useCallback(() => {
    if (rows.length === 0) {
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

    const headers = ['Source Name', 'Quotes']
    const csvRows = rows.map(item => [
      escapeCSV(item.source_name),
      escapeCSV(item.quotes)
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
    link.download = `quotes-by-source_${monthStr}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }, [rows, selectedYear, selectedMonth])

  // Store export function in ref and create stable wrapper
  const exportToCSVRef = useRef(exportToCSV)
  exportToCSVRef.current = exportToCSV
  const stableExportWrapperRef = useRef<(() => void) | null>(null)
  if (!stableExportWrapperRef.current) {
    stableExportWrapperRef.current = () => {
      exportToCSVRef.current()
    }
  }

  // Register export function ONCE on mount
  useEffect(() => {
    if (onExportReady && stableExportWrapperRef.current) {
      onExportReady(stableExportWrapperRef.current)
    }
  }, [onExportReady])

  // Early returns AFTER all hooks
  if (isLoading) {
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalQuotes)}</div>
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
              {rows[0]?.source_name || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(rows[0]?.quotes || 0)} quotes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows.length}</div>
            <p className="text-xs text-muted-foreground">
              Sources generating quotes
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotes by Source</CardTitle>
          <p className="text-sm text-muted-foreground">
            Quote generation performance across all lead sources
          </p>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <SummaryBarChart
              data={chartData}
              title="Quotes"
              height={450}
              color="hsl(var(--accent-foreground))"
            />
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
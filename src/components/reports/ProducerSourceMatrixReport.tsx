import React, { useCallback, useRef, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProducerSourceMatrix } from '@/components/charts/ProducerSourceMatrix'
import { useProducerSourceMatrix } from '@/hooks/useSummariesData'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

interface ProducerSourceMatrixReportProps {
  selectedYear: number
  selectedMonth: number | null
  onExportReady?: (exportFn: (() => void) | null) => void
}

export const ProducerSourceMatrixReport: React.FC<ProducerSourceMatrixReportProps> = ({
  selectedYear,
  selectedMonth,
  onExportReady
}) => {
  const { data, isLoading, error } = useProducerSourceMatrix(selectedYear, selectedMonth)

  // Derive data safely even when data is undefined
  const rows = useMemo(() => data ?? [], [data])

  const totalCombinations = rows.length
  const activeProducers = useMemo(() => new Set(rows.map(item => item.producer_name)).size, [rows])
  const activeSources = useMemo(() => new Set(rows.map(item => item.source_name)).size, [rows])

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

    const headers = ['Producer', 'Source', 'QHH', 'Quotes', 'Items']
    const csvRows = rows.map(item => [
      escapeCSV(item.producer_name),
      escapeCSV(item.source_name),
      escapeCSV(item.qhh),
      escapeCSV(item.quotes),
      escapeCSV(item.items)
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
    link.download = `producer-source-matrix_${monthStr}.csv`
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
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
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
            <CardTitle className="text-sm font-medium">Active Producers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProducers}</div>
            <p className="text-xs text-muted-foreground">
              Producers with activity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSources}</div>
            <p className="text-xs text-muted-foreground">
              Sources generating activity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Combinations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCombinations}</div>
            <p className="text-xs text-muted-foreground">
              Producer-source pairs
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Producer × Source Performance Matrix</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cross-analysis showing quotes, QHH, and items for each producer-source combination.
            Darker colors indicate higher performance.
          </p>
        </CardHeader>
        <CardContent>
          {rows.length > 0 ? (
            <ProducerSourceMatrix
              data={rows}
              height={600}
            />
          ) : (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              No data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ProducerSourceMatrixQHHChart } from '@/components/charts/ProducerSourceMatrixQHHChart'
import { useProducerSourceMatrix } from '@/hooks/useSummariesData'
import { useMonthlySummary } from '@/hooks/useMonthlySummary'
import { formatNumber } from '@/lib/utils'
import { MonthlyTotalsCard } from '@/components/MonthlyTotalsCard'

interface ProducerSourceMatrixQHHReportProps {
  selectedYear: number
  selectedMonth: number | null
  onExportReady?: (exportFn: (() => void) | null) => void
}

export const ProducerSourceMatrixQHHReport: React.FC<ProducerSourceMatrixQHHReportProps> = ({
  selectedYear,
  selectedMonth,
  onExportReady
}) => {
  const { data, isLoading, error } = useProducerSourceMatrix(selectedYear, selectedMonth)
  const { data: monthlySummary, isLoading: isSummaryLoading } = useMonthlySummary(selectedYear, selectedMonth)

  if (isLoading || isSummaryLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">Failed to load matrix data</h3>
            <p className="text-sm text-muted-foreground">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold">No matrix data available</h3>
          <p className="text-sm text-muted-foreground">
            No producer-source data found for the selected period.
          </p>
        </div>
      </div>
    )
  }

  // Calculate summary statistics for QHH
  const totalQHH = monthlySummary?.total_qhh || 0
  const activeProducers = new Set(data.map(item => item.producer_name)).size
  const activeSources = new Set(data.map(item => item.source_name)).size
  const combinations = data.filter(item => item.qhh > 0).length

  // Export to CSV function - matrix format
  const exportToCSV = React.useCallback(() => {
    if (!data || data.length === 0) {
      console.warn('No data to export')
      return
    }

    // Build matrix structure
    const producers = [...new Set(data.map(d => d.producer_name))].sort()
    const sources = [...new Set(data.map(d => d.source_name))].sort()
    const matrixData = new Map<string, number>()
    data.forEach(item => {
      matrixData.set(`${item.producer_name}-${item.source_name}`, item.qhh)
    })

    const producerTotals = producers.map(producer => ({
      producer,
      total: data.filter(d => d.producer_name === producer).reduce((sum, d) => sum + d.qhh, 0)
    }))

    const sourceTotals = sources.map(source => ({
      source,
      total: data.filter(d => d.source_name === source).reduce((sum, d) => sum + d.qhh, 0)
    }))

    const grandTotal = data.reduce((sum, d) => sum + d.qhh, 0)

    const csvData = [
      ['Producer', ...sources, 'Total'],
      ...producerTotals.map(pt => [
        pt.producer,
        ...sources.map(source => 
          String(matrixData.get(`${pt.producer}-${source}`) || 0)
        ),
        String(pt.total)
      ]),
      ['Total', ...sourceTotals.map(st => String(st.total)), String(grandTotal)]
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const monthStr = selectedMonth ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}` : `${selectedYear}`
    link.download = `producer-source-qhh-matrix_${monthStr}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }, [data, selectedYear, selectedMonth])

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
  }, [onExportReady])

  return (
    <div className="space-y-6">
      <MonthlyTotalsCard selectedYear={selectedYear} selectedMonth={selectedMonth} />
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total QHH
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalQHH)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Producers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProducers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSources}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Combinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{combinations}</div>
          </CardContent>
        </Card>
      </div>

      {/* Matrix Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Producer × Source Matrix - QHH</CardTitle>
          <p className="text-sm text-muted-foreground">
            Quoted households breakdown by producer and source. Color intensity indicates relative performance.
          </p>
        </CardHeader>
        <CardContent>
          <ProducerSourceMatrixQHHChart data={data} height={500} />
        </CardContent>
      </Card>
    </div>
  )
}
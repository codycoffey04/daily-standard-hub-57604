import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ProducerSourceMatrixQuotesChart } from '@/components/charts/ProducerSourceMatrixQuotesChart'
import { useProducerSourceMatrix } from '@/hooks/useSummariesData'
import { useMonthlySummary } from '@/hooks/useMonthlySummary'
import { formatNumber } from '@/lib/utils'

interface ProducerSourceMatrixQuotesReportProps {
  selectedYear: number
  selectedMonth: number | null
}

export const ProducerSourceMatrixQuotesReport: React.FC<ProducerSourceMatrixQuotesReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  const { data, isLoading, error } = useProducerSourceMatrix(selectedYear, selectedMonth)
  const { data: monthlySummary } = useMonthlySummary(selectedYear, selectedMonth)

  if (isLoading) {
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

  // Calculate summary statistics for quotes
  const totalQuotes = monthlySummary?.total_quotes || 0
  const activeProducers = new Set(data.map(item => item.producer_name)).size
  const activeSources = new Set(data.map(item => item.source_name)).size
  const combinations = data.filter(item => item.quotes > 0).length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalQuotes)}</div>
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
          <CardTitle>Producer × Source Matrix - Quotes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Quotes breakdown by producer and source. Color intensity indicates relative performance.
          </p>
        </CardHeader>
        <CardContent>
          <ProducerSourceMatrixQuotesChart data={data} height={500} />
        </CardContent>
      </Card>
    </div>
  )
}
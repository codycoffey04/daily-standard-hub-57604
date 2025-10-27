import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SummaryBarChart } from '@/components/charts/SummaryBarChart'
import { useQHHByProducer } from '@/hooks/useSummariesData'
import { useMonthlySummary } from '@/hooks/useMonthlySummary'
import { formatNumber } from '@/lib/utils'

interface QHHByProducerReportProps {
  selectedYear: number
  selectedMonth: number | null
}

export const QHHByProducerReport: React.FC<QHHByProducerReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  const { data, isLoading, error } = useQHHByProducer(selectedYear, selectedMonth)
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
            <h3 className="text-lg font-semibold">Failed to load QHH data</h3>
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
          <h3 className="text-lg font-semibold">No QHH data available</h3>
          <p className="text-sm text-muted-foreground">
            No quoted household data found for the selected period.
          </p>
        </div>
      </div>
    )
  }

  // Calculate summary statistics
  const totalQHH = monthlySummary?.total_qhh || 0
  const topProducer = data[0] // Already sorted by QHH descending
  const averageQHH = totalQHH / data.length

  // Prepare data for chart
  const chartData = data.map(item => ({
    name: item.producer,
    value: item.qhh
  }))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              Top Producer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topProducer.producer}</div>
            <p className="text-sm text-muted-foreground">
              {formatNumber(topProducer.qhh)} QHH
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average QHH per Producer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(Math.round(averageQHH))}</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>QHH by Producer</CardTitle>
        </CardHeader>
        <CardContent>
          <SummaryBarChart
            data={chartData}
            title="QHH by Producer"
            color="hsl(var(--chart-1))"
            height={400}
            formatValue={formatNumber}
          />
        </CardContent>
      </Card>
    </div>
  )
}
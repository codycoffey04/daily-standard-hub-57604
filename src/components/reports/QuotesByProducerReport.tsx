import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SummaryBarChart } from '@/components/charts/SummaryBarChart'
import { useQuotesByProducer } from '@/hooks/useSummariesData'
import { formatNumber } from '@/lib/utils'

interface QuotesByProducerReportProps {
  selectedYear: number
  selectedMonth: number | null
}

export const QuotesByProducerReport: React.FC<QuotesByProducerReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  const { data, isLoading, error } = useQuotesByProducer(selectedYear, selectedMonth)

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
            <h3 className="text-lg font-semibold">Failed to load quotes data</h3>
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
          <h3 className="text-lg font-semibold">No quotes data available</h3>
          <p className="text-sm text-muted-foreground">
            No quotes data found for the selected period.
          </p>
        </div>
      </div>
    )
  }

  // Calculate summary statistics
  const totalQuotes = data.reduce((sum, item) => sum + item.quotes, 0)
  const topProducer = data[0] // Already sorted by quotes descending
  const averageQuotes = totalQuotes / data.length

  // Prepare data for chart
  const chartData = data.map(item => ({
    name: item.producer_name,
    value: item.quotes
  }))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              Top Producer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topProducer.producer_name}</div>
            <p className="text-sm text-muted-foreground">
              {formatNumber(topProducer.quotes)} quotes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Quotes per Producer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(Math.round(averageQuotes))}</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Quotes by Producer</CardTitle>
        </CardHeader>
        <CardContent>
          <SummaryBarChart
            data={chartData}
            title="Quotes by Producer"
            color="hsl(var(--chart-2))"
            height={400}
            formatValue={formatNumber}
          />
        </CardContent>
      </Card>
    </div>
  )
}
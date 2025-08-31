import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryBarChart } from '@/components/charts/SummaryBarChart'
import { useQuotesBySource } from '@/hooks/useSummariesData'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

interface QuotesBySourceReportProps {
  selectedYear: number
  selectedMonth: number | null
}

export const QuotesBySourceReport: React.FC<QuotesBySourceReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  const { data, isLoading, error } = useQuotesBySource(selectedYear, selectedMonth)

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

  const chartData = data?.map(item => ({
    name: item.source_name,
    value: item.quotes
  })) || []

  const totalQuotes = data?.reduce((sum, item) => sum + item.quotes, 0) || 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuotes}</div>
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
              {data?.[0]?.source_name || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.[0]?.quotes || 0} quotes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.length || 0}</div>
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
              height={500}
              color="hsl(var(--accent-foreground))"
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
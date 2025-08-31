import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryBarChart } from '@/components/charts/SummaryBarChart'
import { useItemsByProducer } from '@/hooks/useSummariesData'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

interface ItemsByProducerReportProps {
  selectedYear: number
  selectedMonth: number | null
}

export const ItemsByProducerReport: React.FC<ItemsByProducerReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  const { data, isLoading, error } = useItemsByProducer(selectedYear, selectedMonth)

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
    name: item.producer_name,
    value: item.items
  })) || []

  const totalItems = data?.reduce((sum, item) => sum + item.items, 0) || 0
  const avgItems = data?.length ? Math.round(totalItems / data.length) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Across all producers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Producer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.[0]?.producer_name || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.[0]?.items || 0} items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgItems}</div>
            <p className="text-xs text-muted-foreground">
              Per producer
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items by Producer</CardTitle>
          <p className="text-sm text-muted-foreground">
            Item sales performance across all producers
          </p>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <SummaryBarChart
              data={chartData}
              title="Items"
              height={500}
              color="hsl(var(--success))"
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
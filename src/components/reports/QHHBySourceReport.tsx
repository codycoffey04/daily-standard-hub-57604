import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryBarChart } from '@/components/charts/SummaryBarChart'
import { useQHHBySource } from '@/hooks/useSummariesData'
import { ChartLoading } from '@/components/ui/chart-loading'
import { EmptyState } from '@/components/ui/empty-state'
import { formatNumber } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface QHHBySourceReportProps {
  selectedYear: number
  selectedMonth: number | null
}

export const QHHBySourceReport: React.FC<QHHBySourceReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  console.log('🎯 === QHHBySourceReport RENDERING ===')
  console.log('  Props - selectedYear:', selectedYear, 'selectedMonth:', selectedMonth)
  
  const { data, isLoading, error } = useQHHBySource(selectedYear, selectedMonth)
  
  console.log('  Hook returned - isLoading:', isLoading, 'hasData:', !!data, 'hasError:', !!error)
  if (data) console.log('  Data rows:', data.length)

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

  const chartData = data?.map(item => ({
    name: item.source_name,
    value: item.qhh
  })) || []

  const totalQHH = data?.reduce((sum, item) => sum + item.qhh, 0) || 0

  return (
    <div className="space-y-6">
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
              {data?.[0]?.source_name || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(data?.[0]?.qhh || 0)} QHH
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
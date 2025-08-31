import React, { useState } from 'react'
import { Navigation } from '@/components/Navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthYearPickers } from '@/components/MonthYearPickers'
import { SummaryBarChart } from '@/components/charts/SummaryBarChart'
import { ProducerSourceMatrix } from '@/components/charts/ProducerSourceMatrix'
import { CloseRateChart } from '@/components/charts/CloseRateChart'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Calendar } from 'lucide-react'
import {
  useQHHBySource,
  useQuotesByProducer,
  useQuotesBySource,
  useItemsByProducer,
  useItemsBySource,
  useProducerSourceMatrix,
  useCloseRateAnalysis
} from '@/hooks/useSummariesData'

interface SummaryReportsGridProps {
  selectedYear: number
  selectedMonth: number | null
}

const SummaryReportsGrid: React.FC<SummaryReportsGridProps> = ({
  selectedYear,
  selectedMonth
}) => {
  const qhhBySource = useQHHBySource(selectedYear, selectedMonth)
  const quotesByProducer = useQuotesByProducer(selectedYear, selectedMonth)
  const quotesBySource = useQuotesBySource(selectedYear, selectedMonth)
  const itemsByProducer = useItemsByProducer(selectedYear, selectedMonth)
  const itemsBySource = useItemsBySource(selectedYear, selectedMonth)
  const producerSourceMatrix = useProducerSourceMatrix(selectedYear, selectedMonth)
  const closeRateAnalysis = useCloseRateAnalysis(selectedYear, selectedMonth)

  const LoadingSkeleton = () => (
    <div className="h-64 space-y-3 p-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">QHH by Source</CardTitle>
          <CardDescription>Qualified household distribution</CardDescription>
        </CardHeader>
        <CardContent>
          {qhhBySource.isLoading ? (
            <LoadingSkeleton />
          ) : qhhBySource.error ? (
            <div className="h-64 flex items-center justify-center text-destructive">
              Error loading data
            </div>
          ) : (
            <SummaryBarChart
              data={qhhBySource.data?.map(item => ({
                name: item.source_name,
                value: item.qhh
              })) || []}
              title="QHH"
              color="hsl(var(--chart-1))"
              height={250}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quotes by Producer</CardTitle>
          <CardDescription>Total quotes per producer</CardDescription>
        </CardHeader>
        <CardContent>
          {quotesByProducer.isLoading ? (
            <LoadingSkeleton />
          ) : quotesByProducer.error ? (
            <div className="h-64 flex items-center justify-center text-destructive">
              Error loading data
            </div>
          ) : (
            <SummaryBarChart
              data={quotesByProducer.data?.map(item => ({
                name: item.producer_name,
                value: item.quotes
              })) || []}
              title="Quotes"
              color="hsl(var(--chart-2))"
              height={250}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quotes by Source</CardTitle>
          <CardDescription>Quote generation by lead source</CardDescription>
        </CardHeader>
        <CardContent>
          {quotesBySource.isLoading ? (
            <LoadingSkeleton />
          ) : quotesBySource.error ? (
            <div className="h-64 flex items-center justify-center text-destructive">
              Error loading data
            </div>
          ) : (
            <SummaryBarChart
              data={quotesBySource.data?.map(item => ({
                name: item.source_name,
                value: item.quotes
              })) || []}
              title="Quotes"
              color="hsl(var(--chart-3))"
              height={250}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Items by Producer</CardTitle>
          <CardDescription>Items sold by producer</CardDescription>
        </CardHeader>
        <CardContent>
          {itemsByProducer.isLoading ? (
            <LoadingSkeleton />
          ) : itemsByProducer.error ? (
            <div className="h-64 flex items-center justify-center text-destructive">
              Error loading data
            </div>
          ) : (
            <SummaryBarChart
              data={itemsByProducer.data?.map(item => ({
                name: item.producer_name,
                value: item.items
              })) || []}
              title="Items"
              color="hsl(var(--chart-4))"
              height={250}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Items by Source</CardTitle>
          <CardDescription>Sales performance by source</CardDescription>
        </CardHeader>
        <CardContent>
          {itemsBySource.isLoading ? (
            <LoadingSkeleton />
          ) : itemsBySource.error ? (
            <div className="h-64 flex items-center justify-center text-destructive">
              Error loading data
            </div>
          ) : (
            <SummaryBarChart
              data={itemsBySource.data?.map(item => ({
                name: item.source_name,
                value: item.items
              })) || []}
              title="Items"
              color="hsl(var(--chart-5))"
              height={250}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Producer × Source Matrix</CardTitle>
          <CardDescription>Performance by producer and source</CardDescription>
        </CardHeader>
        <CardContent>
          {producerSourceMatrix.isLoading ? (
            <LoadingSkeleton />
          ) : producerSourceMatrix.error ? (
            <div className="h-64 flex items-center justify-center text-destructive">
              Error loading data
            </div>
          ) : (
            <ProducerSourceMatrix
              data={producerSourceMatrix.data || []}
              height={250}
            />
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2 xl:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg">Close Rate Analysis</CardTitle>
          <CardDescription>Close rate per source (Items ÷ QHH × 100)</CardDescription>
        </CardHeader>
        <CardContent>
          {closeRateAnalysis.isLoading ? (
            <LoadingSkeleton />
          ) : closeRateAnalysis.error ? (
            <div className="h-64 flex items-center justify-center text-destructive">
              Error loading data
            </div>
          ) : (
            <CloseRateChart
              data={closeRateAnalysis.data || []}
              height={300}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const SummariesPage: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(2025)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <BarChart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Summaries & Reports</h1>
          </div>
          <p className="text-muted-foreground">
            Comprehensive analytics and performance summaries
          </p>
        </div>

        {/* Date Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Report Period</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MonthYearPickers
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onYearChange={setSelectedYear}
              onMonthChange={setSelectedMonth}
            />
          </CardContent>
        </Card>

        {/* Summary Reports Grid */}
        <SummaryReportsGrid 
          selectedYear={selectedYear} 
          selectedMonth={selectedMonth} 
        />
      </div>
    </div>
  )
}

export default SummariesPage
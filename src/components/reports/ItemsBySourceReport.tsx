import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { SummaryBarChart } from '@/components/charts/SummaryBarChart'
import { useItemsBySource, ItemsBySourceData } from '@/hooks/useSummariesData'
import { useMonthlySummary } from '@/hooks/useMonthlySummary'
import { ChartLoading } from '@/components/ui/chart-loading'
import { EmptyState } from '@/components/ui/empty-state'
import { formatNumber } from '@/lib/utils'
import { AlertCircle, ArrowUpDown, TrendingUp, Target, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MonthlyTotalsCard } from '@/components/MonthlyTotalsCard'

interface ItemsBySourceReportProps {
  selectedYear: number
  selectedMonth: number | null
}

export const ItemsBySourceReport: React.FC<ItemsBySourceReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  const { data, isLoading, error } = useItemsBySource(selectedYear, selectedMonth)
  const { data: monthlySummary, isLoading: isSummaryLoading } = useMonthlySummary(selectedYear, selectedMonth)
  const [sortColumn, setSortColumn] = useState<keyof ItemsBySourceData>('items')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Helper functions for formatting
  const formatNullable = (
    value: number | null, 
    formatter: (v: number) => string = formatNumber
  ): string => {
    return value === null ? '—' : formatter(value)
  }

  const formatPercent = (value: number): string => `${value.toFixed(1)}%`
  const formatDecimal = (value: number): string => value.toFixed(2)
  const formatCurrency = (value: number): string => `$${formatNumber(Math.round(value))}`

  // Handle sort
  const handleSort = (column: keyof ItemsBySourceData) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Loading state
  if (isLoading || isSummaryLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-muted animate-pulse rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <ChartLoading />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <div className="text-lg font-medium">Error Loading Data</div>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Failed to load items by source data'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <EmptyState
        message="No data available"
        suggestion="No items by source data found for the selected period"
      />
    )
  }

  // Calculate summary totals by summing source-level data
  const totalQHH = data.reduce((sum, item) => sum + item.qhh, 0)
  const totalQuotes = data.reduce((sum, item) => sum + item.quotes, 0)
  const totalItems = data.reduce((sum, item) => sum + item.items, 0)

  // Prepare data for bar chart (top 10 by items)
  const top10Data = [...data]
    .sort((a, b) => b.items - a.items)
    .slice(0, 10)
    .map(item => ({
      name: item.source_name,
      value: item.items
    }))

  // Sort data for table
  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortColumn]
    const bVal = b[sortColumn]
    
    // Handle NULL values (sort to bottom)
    if (aVal === null && bVal === null) return 0
    if (aVal === null) return 1
    if (bVal === null) return -1
    
    const comparison = aVal > bVal ? 1 : -1
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const SortButton: React.FC<{ column: keyof ItemsBySourceData; label: string }> = ({ 
    column, 
    label 
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(column)}
      className="h-8 px-2 hover:bg-muted/50"
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  )

  return (
    <div className="space-y-6">
      <MonthlyTotalsCard selectedYear={selectedYear} selectedMonth={selectedMonth} />
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total QHH</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalQHH)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalQuotes)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Quote presentations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalItems)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Items sold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Sources by Items</CardTitle>
        </CardHeader>
        <CardContent>
          <SummaryBarChart
            data={top10Data}
            title="Items"
            height={450}
            color="hsl(var(--success))"
          />
        </CardContent>
      </Card>

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Sources - Detail View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">
                    <SortButton column="source_name" label="Source" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton column="qhh" label="QHH" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton column="quotes" label="Quotes" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton column="items" label="Items" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton column="items_per_qhh" label="Items/QHH" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton column="items_per_quote" label="Items/Quote" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton column="qhh_rows_detail" label="Detail Rows" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton column="detail_coverage_pct" label="Coverage %" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton column="bundle_rate" label="Bundle Rate" />
                  </TableHead>
                  <TableHead className="text-right min-w-[120px]">
                    <SortButton column="avg_quoted_premium" label="Avg Quoted" />
                  </TableHead>
                  <TableHead className="text-right min-w-[120px]">
                    <SortButton column="avg_sold_quote_premium" label="Avg Sold" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row) => (
                  <TableRow key={row.source_id}>
                    <TableCell className="font-medium">{row.source_name}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.qhh)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.quotes)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.items)}</TableCell>
                    <TableCell className="text-right">
                      {formatNullable(row.items_per_qhh, formatDecimal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNullable(row.items_per_quote, formatDecimal)}
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(row.qhh_rows_detail)}</TableCell>
                    <TableCell className="text-right">
                      {formatNullable(row.detail_coverage_pct, formatPercent)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNullable(row.bundle_rate, formatPercent)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNullable(row.avg_quoted_premium, formatCurrency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNullable(row.avg_sold_quote_premium, formatCurrency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

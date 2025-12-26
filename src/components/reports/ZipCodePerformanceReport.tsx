import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ChartLoading } from '@/components/ui/chart-loading'
import { EmptyState } from '@/components/ui/empty-state'
import { AlertCircle, ArrowUpDown, MapPin, TrendingUp, DollarSign, ShoppingCart, Calendar as CalendarIcon } from 'lucide-react'
import { useZipPerformance, ZipPerformanceRow } from '@/hooks/useZipPerformance'
import { useSourcesForSelection } from '@/hooks/useSourcesForSelection'
import { useProducersForSelection } from '@/hooks/useProducersForSelection'
import { formatNumber, cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format } from 'date-fns'

interface ZipCodePerformanceReportProps {
  selectedYear: number
  selectedMonth: number | null
  onExportReady?: (exportFn: (() => void) | null) => void
}

export const ZipCodePerformanceReport: React.FC<ZipCodePerformanceReportProps> = ({
  selectedYear,
  selectedMonth,
  onExportReady
}) => {
  // Calculate default date range (current month)
  const getDefaultDateRange = () => {
    const month = selectedMonth || new Date().getMonth() + 1
    const year = selectedYear
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { startDate, endDate }
  }

  const defaultRange = useMemo(() => getDefaultDateRange(), [selectedMonth, selectedYear])

  // Filter state - using Date objects for Calendar component, but convert to strings for API
  const [fromDateObj, setFromDateObj] = useState<Date>(() => new Date(defaultRange.startDate))
  const [toDateObj, setToDateObj] = useState<Date>(() => new Date(defaultRange.endDate))
  
  // Convert Date objects to YYYY-MM-DD strings for API calls
  const fromDate = useMemo(() => format(fromDateObj, 'yyyy-MM-dd'), [fromDateObj])
  const toDate = useMemo(() => format(toDateObj, 'yyyy-MM-dd'), [toDateObj])
  const [selectedProducerId, setSelectedProducerId] = useState<string | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [minQuotes, setMinQuotes] = useState(1)
  const [includeUnknown, setIncludeUnknown] = useState(false)

  // Table sorting state
  const [sortColumn, setSortColumn] = useState<keyof ZipPerformanceRow>('quotes')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Fetch data
  const { data, isLoading, error } = useZipPerformance({
    fromDate,
    toDate,
    producerId: selectedProducerId,
    sourceId: selectedSourceId,
    minQuotes,
    includeUnknown
  })

  // Fetch sources and producers for filter dropdowns
  const { data: sources } = useSourcesForSelection()
  const { data: producers } = useProducersForSelection()

  // Derive data safely even when data is undefined
  const rows = useMemo(() => data?.rows ?? [], [data?.rows])
  const summary = data?.summary

  // Format currency
  const formatCurrency = (value: number): string => `$${formatNumber(Math.round(value))}`

  // Handle sorting
  const handleSort = (column: keyof ZipPerformanceRow) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Sort table data
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      
      const comparison = aVal > bVal ? 1 : -1
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [rows, sortColumn, sortDirection])

  // Top 10 zips for chart
  const chartData = useMemo(() => {
    return [...rows]
      .sort((a, b) => b.quotes - a.quotes)
      .slice(0, 10)
      .map(row => ({
        zip: row.zip_code,
        quotes: row.quotes,
        hasSales: row.sales > 0
      }))
  }, [rows])

  // Export to CSV function - all hooks MUST be called before any early returns
  const exportToCSV = useCallback(() => {
    if (sortedRows.length === 0) {
      console.warn('No data to export')
      return
    }

    // Helper function to escape CSV values
    const escapeCSV = (value: string | number): string => {
      const str = String(value)
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Create CSV headers
    const headers = ['ZIP Code', 'Quotes', 'Sales', 'Conversion %', 'Premium', 'Items Sold']
    
    // Create CSV rows using sortedRows to match what's displayed
    const csvRows = sortedRows.map(row => [
      escapeCSV(row.zip_code),
      escapeCSV(row.quotes),
      escapeCSV(row.sales),
      escapeCSV(row.conversion_rate.toFixed(2)),
      escapeCSV(Math.round(row.premium)),
      escapeCSV(row.items_sold)
    ])

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // Generate filename with date range
    const dateRange = fromDate && toDate 
      ? `_${fromDate}_to_${toDate}`.replace(/-/g, '')
      : ''
    link.download = `zip-code-performance${dateRange}.csv`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }, [sortedRows, fromDate, toDate])

  // Store export function in ref so we always call the latest version without re-registering
  const exportToCSVRef = useRef(exportToCSV)
  exportToCSVRef.current = exportToCSV

  // Create stable wrapper function ONCE that always calls the latest export function via ref
  const stableExportWrapperRef = useRef<(() => void) | null>(null)
  if (!stableExportWrapperRef.current) {
    stableExportWrapperRef.current = () => {
      exportToCSVRef.current()
    }
  }

  // Register export function ONCE on mount - wrapper is stable, never changes
  useEffect(() => {
    if (onExportReady && stableExportWrapperRef.current) {
      onExportReady(stableExportWrapperRef.current)
    }
  }, [onExportReady])

  // Early returns AFTER all hooks
  if (isLoading) return <ChartLoading />

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <div>
            <p className="text-lg font-medium text-foreground">Error loading data</p>
            <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
          </div>
        </div>
      </div>
    )
  }

  if (rows.length === 0 || !summary) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Refine your ZIP code analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fromDateObj && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDateObj ? format(fromDateObj, "MMM dd, yyyy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <Calendar
                    mode="single"
                    selected={fromDateObj}
                    onSelect={(date) => {
                      if (date) {
                        setFromDateObj(date)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !toDateObj && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDateObj ? format(toDateObj, "MMM dd, yyyy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <Calendar
                    mode="single"
                    selected={toDateObj}
                    onSelect={(date) => {
                      if (date) {
                        setToDateObj(date)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Producer Filter */}
            <div className="space-y-2">
              <Label htmlFor="producer">Producer</Label>
              <Select
                value={selectedProducerId || 'all'}
                onValueChange={(value) => setSelectedProducerId(value === 'all' ? null : value)}
              >
                <SelectTrigger id="producer">
                  <SelectValue placeholder="All Producers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Producers</SelectItem>
                  {producers?.map((producer) => (
                    <SelectItem key={producer.id} value={producer.id}>
                      {producer.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source Filter */}
            <div className="space-y-2">
              <Label htmlFor="source">Lead Source</Label>
              <Select
                value={selectedSourceId || 'all'}
                onValueChange={(value) => setSelectedSourceId(value === 'all' ? null : value)}
              >
                <SelectTrigger id="source">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources?.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min Quotes */}
            <div className="space-y-2">
              <Label htmlFor="min-quotes">Min Quotes</Label>
              <Input
                id="min-quotes"
                type="number"
                min="1"
                value={minQuotes}
                onChange={(e) => setMinQuotes(parseInt(e.target.value) || 1)}
              />
            </div>

            {/* Include Unknown */}
            <div className="space-y-2">
              <Label htmlFor="include-unknown" className="block mb-2">Options</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-unknown"
                  checked={includeUnknown}
                  onCheckedChange={(checked) => setIncludeUnknown(checked as boolean)}
                />
                <label
                  htmlFor="include-unknown"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include Unknown
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unique ZIPs</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.total_unique_zips)}</div>
            <p className="text-xs text-muted-foreground">Geographic coverage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.total_quotes)}</div>
            <p className="text-xs text-muted-foreground">Across all ZIPs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.total_sales)}</div>
            <p className="text-xs text-muted-foreground">Successful conversions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summary.top_zip ? (
              <>
                <div className="text-2xl font-bold">{summary.top_zip.zip_code}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.top_zip.conversion_rate.toFixed(1)}% conversion
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>ZIP Code Performance</CardTitle>
          <CardDescription>
            Showing {rows.length} ZIP code{rows.length !== 1 ? 's' : ''} • 
            {fromDate && toDate && ` ${format(new Date(fromDate), 'MMM dd, yyyy')} - ${format(new Date(toDate), 'MMM dd, yyyy')}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort('zip_code')}>
                      ZIP Code
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('quotes')}>
                      Quotes
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('sales')}>
                      Sales
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('conversion_rate')}>
                      Conversion %
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('premium')}>
                      Premium
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('items_sold')}>
                      Items Sold
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={row.zip_code}>
                    <TableCell className="font-medium">{row.zip_code}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.quotes)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.sales)}</TableCell>
                    <TableCell className="text-right">{row.conversion_rate.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.premium)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.items_sold)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Top 10 Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 ZIP Codes by Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 50 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="zip" width={60} />
                  <Tooltip 
                    formatter={(value: number) => [formatNumber(value), 'Quotes']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="quotes" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.hasSales ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
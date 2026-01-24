import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useWeeklyProducerSummary, type WeeklyProducerData } from '@/hooks/useWeeklyProducerSummary'
import { Users, TrendingUp, DollarSign, Target, CalendarIcon, Copy, Check } from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface WeeklyProducerSummaryReportProps {
  selectedYear: number
  selectedMonth: number | null
  onExportReady?: (exportFn: (() => void) | null) => void
}

type SortField = 'producer_name' | 'qhh' | 'quotes' | 'sales' | 'items' | 'premium' | 'close_rate'
type SortDirection = 'asc' | 'desc'
type DatePreset = 'last7' | 'lastWeek' | 'custom'

export const WeeklyProducerSummaryReport: React.FC<WeeklyProducerSummaryReportProps> = ({
  onExportReady
}) => {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  // Date state - internal to component
  const [preset, setPreset] = useState<DatePreset>('last7')
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 7))

  // Calculate actual date range based on preset
  const { fromDate, toDate } = useMemo(() => {
    const today = new Date()

    switch (preset) {
      case 'last7':
        return {
          fromDate: subDays(today, 6),
          toDate: today
        }
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }) // Monday
        const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }) // Sunday
        return {
          fromDate: lastWeekStart,
          toDate: lastWeekEnd
        }
      case 'custom':
        return {
          fromDate: customStartDate,
          toDate: subDays(customStartDate, -6) // 7 days total
        }
    }
  }, [preset, customStartDate])

  const fromDateStr = format(fromDate, 'yyyy-MM-dd')
  const toDateStr = format(toDate, 'yyyy-MM-dd')

  const { data: producersData, isLoading, error } = useWeeklyProducerSummary(fromDateStr, toDateStr)

  const [sortField, setSortField] = useState<SortField>('close_rate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedData = useMemo(() => {
    if (!producersData) return []

    return [...producersData].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      const aNum = Number(aValue) || 0
      const bNum = Number(bValue) || 0
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
    })
  }, [producersData, sortField, sortDirection])

  const teamTotals = useMemo(() => {
    if (!producersData || producersData.length === 0) return null

    const totals = producersData.reduce((acc, p) => ({
      qhh: acc.qhh + p.qhh,
      quotes: acc.quotes + p.quotes,
      sales: acc.sales + p.sales,
      items: acc.items + p.items,
      premium: acc.premium + p.premium
    }), { qhh: 0, quotes: 0, sales: 0, items: 0, premium: 0 })

    return {
      ...totals,
      close_rate: totals.qhh > 0 ? (totals.sales / totals.qhh) * 100 : 0
    }
  }, [producersData])

  // Export to CSV function
  const exportToCSV = useCallback(() => {
    if (!sortedData || sortedData.length === 0) {
      console.warn('No data to export')
      return
    }

    const escapeCSV = (value: string | number | null | undefined): string => {
      if (value == null) return ''
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const headers = ['Rank', 'Producer', 'QHH', 'Quotes', 'Sales', 'Items', 'Premium', 'Close Rate']

    const csvRows = sortedData.map((producer, index) => [
      escapeCSV(index + 1),
      escapeCSV(producer.producer_name),
      escapeCSV(producer.qhh),
      escapeCSV(producer.quotes),
      escapeCSV(producer.sales),
      escapeCSV(producer.items),
      escapeCSV(producer.premium.toFixed(2)),
      escapeCSV(producer.close_rate.toFixed(1) + '%')
    ])

    // Add team totals row
    if (teamTotals) {
      csvRows.push([
        '',
        'TEAM TOTAL',
        escapeCSV(teamTotals.qhh),
        escapeCSV(teamTotals.quotes),
        escapeCSV(teamTotals.sales),
        escapeCSV(teamTotals.items),
        escapeCSV(teamTotals.premium.toFixed(2)),
        escapeCSV(teamTotals.close_rate.toFixed(1) + '%')
      ])
    }

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `weekly-producer-summary_${fromDateStr}_to_${toDateStr}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }, [sortedData, teamTotals, fromDateStr, toDateStr])

  // Export to Markdown function
  const exportToMarkdown = useCallback(() => {
    if (!sortedData || sortedData.length === 0) {
      toast({
        title: 'No data to export',
        variant: 'destructive'
      })
      return
    }

    const dateRange = `${format(fromDate, 'MMM dd')} - ${format(toDate, 'MMM dd, yyyy')}`

    let md = `## Weekly Producer Summary\n**Week of:** ${dateRange}\n\n`

    // Team Totals table
    if (teamTotals) {
      md += `### Team Totals\n`
      md += `| Metric | Value |\n`
      md += `|--------|-------|\n`
      md += `| Total QHH | ${teamTotals.qhh} |\n`
      md += `| Total Quotes | ${teamTotals.quotes} |\n`
      md += `| Total Sales | ${teamTotals.sales} |\n`
      md += `| Total Items | ${teamTotals.items} |\n`
      md += `| Total Premium | $${teamTotals.premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |\n`
      md += `| Team Close Rate | ${teamTotals.close_rate.toFixed(1)}% |\n\n`
    }

    // Producer Performance table
    md += `### Producer Performance\n\n`
    md += `| Producer | QHH | Quotes | Sales | Items | Premium | Close Rate |\n`
    md += `|----------|-----|--------|-------|-------|---------|------------|\n`

    for (const producer of sortedData) {
      md += `| ${producer.producer_name} | ${producer.qhh} | ${producer.quotes} | ${producer.sales} | ${producer.items} | $${producer.premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | ${producer.close_rate.toFixed(1)}% |\n`
    }

    if (teamTotals) {
      md += `| **TEAM TOTAL** | **${teamTotals.qhh}** | **${teamTotals.quotes}** | **${teamTotals.sales}** | **${teamTotals.items}** | **$${teamTotals.premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** | **${teamTotals.close_rate.toFixed(1)}%** |\n`
    }

    md += `\n---\n*Generated from The Daily Standard on ${format(new Date(), 'MMM dd, yyyy')}*\n`

    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      toast({
        title: 'Copied to clipboard',
        description: 'Markdown table copied - paste into your coaching workflow'
      })
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'destructive'
      })
    })
  }, [sortedData, teamTotals, fromDate, toDate, toast])

  // Store export function in ref and create stable wrapper
  const exportToCSVRef = useRef(exportToCSV)
  exportToCSVRef.current = exportToCSV
  const stableExportWrapperRef = useRef<(() => void) | null>(null)
  if (!stableExportWrapperRef.current) {
    stableExportWrapperRef.current = () => {
      exportToCSVRef.current()
    }
  }

  // Register export function ONCE on mount
  useEffect(() => {
    if (onExportReady && stableExportWrapperRef.current) {
      onExportReady(stableExportWrapperRef.current)
    }
  }, [onExportReady])

  const SortHeader: React.FC<{ field: SortField; label: string; align?: 'left' | 'right' }> = ({ field, label, align = 'right' }) => (
    <TableHead
      className={cn(
        "cursor-pointer hover:bg-muted/50",
        align === 'right' && "text-right"
      )}
      onClick={() => handleSort(field)}
    >
      {label} {sortField === field && (sortDirection === 'asc' ? '↑' : '↓')}
    </TableHead>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-10 w-64" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            Error loading weekly summary: {error.message}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Filter Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Date Range:</span>
            </div>

            <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7">Last 7 Days</SelectItem>
                <SelectItem value="lastWeek">Last Full Week (Mon-Sun)</SelectItem>
                <SelectItem value="custom">Custom Start Date</SelectItem>
              </SelectContent>
            </Select>

            {preset === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(customStartDate, 'MMM dd, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={(date) => date && setCustomStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}

            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{format(fromDate, 'MMM dd')} - {format(toDate, 'MMM dd, yyyy')}</span>
            </div>

            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToMarkdown}
                className="flex items-center gap-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy Markdown'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {teamTotals && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Total QHH</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamTotals.qhh}</div>
              <p className="text-xs text-muted-foreground">Quoted Households</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamTotals.sales}</div>
              <p className="text-xs text-muted-foreground">Policies Sold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Total Premium</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${teamTotals.premium.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-muted-foreground">Premium Written</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Team Close Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamTotals.close_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Sales / QHH</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Producer Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Producer Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {(!producersData || producersData.length === 0) ? (
            <div className="text-center text-muted-foreground py-8">
              No producer data available for the selected period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <SortHeader field="producer_name" label="Producer" align="left" />
                    <SortHeader field="qhh" label="QHH" />
                    <SortHeader field="quotes" label="Quotes" />
                    <SortHeader field="sales" label="Sales" />
                    <SortHeader field="items" label="Items" />
                    <SortHeader field="premium" label="Premium" />
                    <SortHeader field="close_rate" label="Close Rate" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((producer, index) => (
                    <TableRow key={producer.producer_id}>
                      <TableCell className="font-medium">#{index + 1}</TableCell>
                      <TableCell className="font-medium">{producer.producer_name}</TableCell>
                      <TableCell className="text-right">{producer.qhh}</TableCell>
                      <TableCell className="text-right">{producer.quotes}</TableCell>
                      <TableCell className="text-right">{producer.sales}</TableCell>
                      <TableCell className="text-right">{producer.items}</TableCell>
                      <TableCell className="text-right">
                        ${producer.premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        producer.close_rate >= 40 && "text-green-600",
                        producer.close_rate >= 25 && producer.close_rate < 40 && "text-yellow-600",
                        producer.close_rate < 25 && "text-red-600"
                      )}>
                        {producer.close_rate.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Team Totals Row */}
                  {teamTotals && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell></TableCell>
                      <TableCell>TEAM TOTALS</TableCell>
                      <TableCell className="text-right">{teamTotals.qhh}</TableCell>
                      <TableCell className="text-right">{teamTotals.quotes}</TableCell>
                      <TableCell className="text-right">{teamTotals.sales}</TableCell>
                      <TableCell className="text-right">{teamTotals.items}</TableCell>
                      <TableCell className="text-right">
                        ${teamTotals.premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">{teamTotals.close_rate.toFixed(1)}%</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

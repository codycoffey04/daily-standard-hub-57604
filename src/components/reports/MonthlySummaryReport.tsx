import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ChartLoading } from '@/components/ui/chart-loading'
import { useMonthlySummary, useTopSourcesByMonth, MonthlySummaryData } from '@/hooks/useMonthlySummary'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ArrowUp, ArrowDown, TrendingUp, Users, Phone, Clock, Target, Award } from 'lucide-react'
import dayjs from 'dayjs'

interface MonthlySummaryReportProps {
  selectedYear: number
  selectedMonth: number | null
}

type SortField = 'month' | 'qhh' | 'quotes' | 'dials' | 'talk_time' | 'framework'
type SortDirection = 'asc' | 'desc'

const MonthlySummaryReport: React.FC<MonthlySummaryReportProps> = ({ selectedYear, selectedMonth }) => {
  const [sortField, setSortField] = useState<SortField>('month')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const { data: summaryData, isLoading, error } = useMonthlySummary(selectedYear, selectedMonth)

  // Get most recent month for top sources
  const mostRecentMonth = useMemo(() => {
    if (!summaryData || summaryData.length === 0) return null
    return summaryData[0].month_key
  }, [summaryData])

  const { data: topQuoteSources } = useTopSourcesByMonth(mostRecentMonth, 'quotes')
  const { data: topQHHSources } = useTopSourcesByMonth(mostRecentMonth, 'qhh')

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!summaryData || summaryData.length === 0) {
      return {
        totalQHH: 0,
        totalQuotes: 0,
        avgFramework: 0,
        totalDials: 0,
        totalTalkTimeHrs: 0,
        avgQuotesPerHH: 0
      }
    }

    const totalQHH = summaryData.reduce((sum, m) => sum + (m?.qhh_total ?? 0), 0)
    const totalQuotes = summaryData.reduce((sum, m) => sum + (m?.quotes_total ?? 0), 0)
    const avgFramework = summaryData.reduce((sum, m) => sum + (m?.framework_compliance_pct ?? 0), 0) / summaryData.length
    const totalDials = summaryData.reduce((sum, m) => sum + (m?.dials_total ?? 0), 0)
    const totalTalkMins = summaryData.reduce((sum, m) => sum + (m?.talk_minutes_total ?? 0), 0)
    const totalTalkTimeHrs = Math.round(totalTalkMins / 60)
    const avgQuotesPerHH = totalQHH > 0 ? (totalQuotes / totalQHH) : 0

    return {
      totalQHH,
      totalQuotes,
      avgFramework,
      totalDials,
      totalTalkTimeHrs,
      avgQuotesPerHH
    }
  }, [summaryData])

  // Sort table data
  const sortedData = useMemo(() => {
    if (!summaryData) return []
    
    const sorted = [...summaryData].sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (sortField) {
        case 'month':
          aVal = a.month_key
          bVal = b.month_key
          break
        case 'qhh':
          aVal = a.qhh_total
          bVal = b.qhh_total
          break
        case 'quotes':
          aVal = a.quotes_total
          bVal = b.quotes_total
          break
        case 'dials':
          aVal = a.dials_total
          bVal = b.dials_total
          break
        case 'talk_time':
          aVal = a.talk_minutes_total
          bVal = b.talk_minutes_total
          break
        case 'framework':
          aVal = a.framework_compliance_pct
          bVal = b.framework_compliance_pct
          break
        default:
          return 0
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })
    
    return sorted
  }, [summaryData, sortField, sortDirection])

  // Calculate month-over-month changes
  const dataWithChanges = useMemo(() => {
    return sortedData.map((month, index) => {
      const previousMonth = sortedData[index + 1]
      
      const calculateChange = (current: number | undefined, previous: number | undefined) => {
        if (current == null || previous == null || previous === 0) return { value: '—', color: 'text-muted-foreground', icon: null }
        
        const percentChange = ((current - previous) / previous) * 100
        const formattedValue = `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`
        
        if (percentChange > 0) {
          return { 
            value: formattedValue, 
            color: 'text-green-600 dark:text-green-400', 
            icon: <ArrowUp className="inline w-3 h-3" /> 
          }
        } else if (percentChange < 0) {
          return { 
            value: formattedValue, 
            color: 'text-red-600 dark:text-red-400', 
            icon: <ArrowDown className="inline w-3 h-3" /> 
          }
        }
        return { value: '0.0%', color: 'text-muted-foreground', icon: null }
      }
      
      return {
        ...month,
        qhhChange: calculateChange(month.qhh_total, previousMonth?.qhh_total),
        quotesChange: calculateChange(month.quotes_total, previousMonth?.quotes_total),
        dialsChange: calculateChange(month.dials_total, previousMonth?.dials_total),
        frameworkChange: calculateChange(month.framework_compliance_pct, previousMonth?.framework_compliance_pct)
      }
    })
  }, [sortedData])

  // Chart data
  const chartData = useMemo(() => {
    if (!summaryData) return []
    return [...summaryData].reverse().map(month => ({
      month: dayjs(month?.month_key).format('MMM'),
      qhh: month?.qhh_total ?? 0,
      quotes: month?.quotes_total ?? 0,
      framework: month?.framework_compliance_pct ?? 0
    }))
  }, [summaryData])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <ChartLoading />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading monthly summary: {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    )
  }

  if (!summaryData || summaryData.length === 0) {
    return <EmptyState message="No activity data found for this period." />
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Total QHH
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryMetrics.totalQHH.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Quotes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryMetrics.totalQuotes.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Avg Framework Compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryMetrics.avgFramework.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Total Outbound Dials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryMetrics.totalDials.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Total Talk Time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryMetrics.totalTalkTimeHrs.toLocaleString()} hrs</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Avg Quotes per Household
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryMetrics.avgQuotesPerHH.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Month-by-Month Table */}
      <Card>
        <CardHeader>
          <CardTitle>Month-by-Month Breakdown</CardTitle>
          <CardDescription>Performance metrics with month-over-month comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('month')}>
                    Month {sortField === 'month' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => handleSort('qhh')}>
                    QHH {sortField === 'qhh' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => handleSort('quotes')}>
                    Quotes {sortField === 'quotes' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => handleSort('dials')}>
                    Dials {sortField === 'dials' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => handleSort('talk_time')}>
                    Talk Time {sortField === 'talk_time' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => handleSort('framework')}>
                    Framework % {sortField === 'framework' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dataWithChanges ?? []).map((month) => (
                  <TableRow key={month.month_key}>
                    <TableCell className="font-medium">
                      {dayjs(month?.month_key).format('MMM YYYY')}
                    </TableCell>
                    <TableCell className="text-right">{(month?.qhh_total ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{(month?.quotes_total ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{(month?.dials_total ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Math.round((month?.talk_minutes_total ?? 0) / 60)} hrs</TableCell>
                    <TableCell className="text-right">{(month?.framework_compliance_pct ?? 0).toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <span className={month.qhhChange.color}>
                        {month.qhhChange.icon} {month.qhhChange.value}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Top Sources Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Sources for Quotes</CardTitle>
            <CardDescription>
              {mostRecentMonth ? dayjs(mostRecentMonth).format('MMMM YYYY') : 'Most Recent Month'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topQuoteSources && topQuoteSources.length > 0 ? (
              <div className="space-y-3">
                {topQuoteSources.map((source, index) => (
                  <div key={source.source_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium">{source.source_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{source?.metric_value ?? 0}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {(source?.percentage ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Sources for QHH</CardTitle>
            <CardDescription>
              {mostRecentMonth ? dayjs(mostRecentMonth).format('MMMM YYYY') : 'Most Recent Month'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topQHHSources && topQHHSources.length > 0 ? (
              <div className="space-y-3">
                {topQHHSources.map((source, index) => (
                  <div key={source.source_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium">{source.source_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{source?.metric_value ?? 0}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {(source?.percentage ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription>QHH, Quotes, and Framework Compliance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                yAxisId="left"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Framework %', angle: 90, position: 'insideRight' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="qhh" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="QHH"
                dot={{ fill: '#3B82F6' }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="quotes" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Quotes"
                dot={{ fill: '#10B981' }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="framework" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                name="Framework %"
                dot={{ fill: '#8B5CF6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export default MonthlySummaryReport

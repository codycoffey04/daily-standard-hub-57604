import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useProducerTrends } from '@/hooks/useProducerTrends'
import { ProducerTrendsDateFilter } from './ProducerTrendsDateFilter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartLoading } from '@/components/ui/chart-loading'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { formatNumber } from '@/lib/utils'
import { formatCTDate } from '@/lib/timezone'
import { TrendingUp, TrendingDown, Minus, Users, Calendar } from 'lucide-react'

interface Producer {
  id: string
  name: string
}

interface ProducerTrendsReportProps {
  selectedYear: number
  selectedMonth: number | null
}

export const ProducerTrendsReport: React.FC<ProducerTrendsReportProps> = () => {
  const [dateFrom, setDateFrom] = useState('2025-04-01')
  const [dateTo, setDateTo] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [selectedProducers, setSelectedProducers] = useState<string[] | null>(null)

  const { data: producers } = useQuery({
    queryKey: ['producers-active'],
    queryFn: async (): Promise<Producer[]> => {
      const { data, error } = await supabase
        .from('producers')
        .select('id, display_name')
        .eq('active', true)
        .order('display_name')
      
      if (error) throw error
      return (data || []).map(p => ({ id: p.id, name: p.display_name }))
    }
  })

  const { data: trendsData, isLoading, error } = useProducerTrends(
    selectedProducers,
    dateFrom,
    dateTo
  )

  const handleDateRangeChange = (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
  }

  const summaryStats = useMemo(() => {
    if (!trendsData || trendsData.length === 0) return null

    const uniqueProducers = new Set(trendsData.map(d => d.producer_id)).size
    const totalDials = trendsData.reduce((sum, d) => sum + d.outbound_dials, 0)
    const totalQHH = trendsData.reduce((sum, d) => sum + d.qhh, 0)
    const totalSales = trendsData.reduce((sum, d) => sum + d.sold_items, 0)
    const totalPremium = trendsData.reduce((sum, d) => sum + d.sold_premium, 0)
    const avgQHH = trendsData.length > 0 ? totalQHH / trendsData.length : 0
    const avgSales = trendsData.length > 0 ? totalSales / trendsData.length : 0

    return {
      uniqueProducers,
      totalDials,
      totalQHH,
      totalSales,
      totalPremium,
      avgQHH,
      avgSales
    }
  }, [trendsData])

  const getFrameworkBadge = (status: 'Top' | 'Bottom' | 'Outside') => {
    const variants = {
      Top: { variant: 'default' as const, className: 'bg-green-600 hover:bg-green-700', icon: TrendingUp },
      Bottom: { variant: 'default' as const, className: 'bg-yellow-600 hover:bg-yellow-700', icon: Minus },
      Outside: { variant: 'default' as const, className: 'bg-red-600 hover:bg-red-700', icon: TrendingDown }
    }
    const config = variants[status]
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    )
  }

  if (isLoading) return <ChartLoading />
  
  if (error) {
    return (
      <EmptyState 
        message="Error loading producer trends"
        suggestion="Please try again or contact support if the issue persists"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProducerTrendsDateFilter onDateRangeChange={handleDateRangeChange} />
        </CardContent>
      </Card>

      {/* Producer Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Filter by Producer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedProducers ? 'selected' : 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                setSelectedProducers(null)
              }
            }}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="All Producers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Producers</SelectItem>
              {producers?.map((producer) => (
                <SelectItem 
                  key={producer.id} 
                  value={producer.id}
                  onClick={() => setSelectedProducers([producer.id])}
                >
                  {producer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Producers Tracked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.uniqueProducers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total QHH</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summaryStats.totalQHH)}</div>
              <p className="text-xs text-muted-foreground mt-1">Avg: {summaryStats.avgQHH.toFixed(1)}/day</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summaryStats.totalSales)}</div>
              <p className="text-xs text-muted-foreground mt-1">Avg: {summaryStats.avgSales.toFixed(1)}/day</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Premium</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${formatNumber(Math.round(summaryStats.totalPremium))}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Trend Data</CardTitle>
          <p className="text-sm text-muted-foreground">
            Showing {trendsData?.length || 0} entries from {formatCTDate(dateFrom)} to {formatCTDate(dateTo)}
          </p>
        </CardHeader>
        <CardContent>
          {!trendsData || trendsData.length === 0 ? (
            <EmptyState 
              message="No data for selected period"
              suggestion="Try selecting a different date range or producer"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Producer</TableHead>
                    <TableHead className="text-right">Dials</TableHead>
                    <TableHead className="text-right">Talk Mins</TableHead>
                    <TableHead className="text-right">QHH</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Quotes</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Premium</TableHead>
                    <TableHead>Framework</TableHead>
                    <TableHead className="text-center">Days T/B/O</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trendsData.map((row, idx) => (
                    <TableRow key={`${row.producer_id}-${row.entry_date}-${idx}`}>
                      <TableCell className="font-medium">{formatCTDate(row.entry_date)}</TableCell>
                      <TableCell>{row.producer_name}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.outbound_dials)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.talk_minutes)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.qhh)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.items)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.quotes)}</TableCell>
                      <TableCell className="text-right">{formatNumber(row.sold_items)}</TableCell>
                      <TableCell className="text-right">${formatNumber(Math.round(row.sold_premium))}</TableCell>
                      <TableCell>{getFrameworkBadge(row.framework_status)}</TableCell>
                      <TableCell className="text-center text-sm">
                        <span className="text-green-600 dark:text-green-400">{row.days_top}</span>
                        {' / '}
                        <span className="text-yellow-600 dark:text-yellow-400">{row.days_bottom}</span>
                        {' / '}
                        <span className="text-red-600 dark:text-red-400">{row.days_outside}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

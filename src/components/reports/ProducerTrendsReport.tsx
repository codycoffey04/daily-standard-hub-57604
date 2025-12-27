import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
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
  onExportReady?: (exportFn: () => void) => void
}

export const ProducerTrendsReport: React.FC<ProducerTrendsReportProps> = ({ onExportReady }) => {
  const { session, loading: authLoading } = useAuth()
  const [dateFrom, setDateFrom] = useState('2025-04-01')
  const [dateTo, setDateTo] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [selectedProducers, setSelectedProducers] = useState<string[] | null>(null)

  const { data: producers, isLoading: isLoadingProducers, error: producersError } = useQuery({
    queryKey: ['producers-active'],
    queryFn: async (): Promise<Producer[]> => {
      const { data, error } = await supabase
        .from('producers')
        .select('id, display_name')
        .eq('active', true)
        .order('display_name')
      
      if (error) throw error
      return (data || []).map(p => ({ id: p.id, name: p.display_name }))
    },
    enabled: !authLoading && !!session,
    retry: 1
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

  const byProducer = useMemo(() => trendsData?.byProducer ?? [], [trendsData])

  const summaryStats = useMemo(() => {
    if (!trendsData || trendsData.byProducer.length === 0) return null

    const uniqueProducers = trendsData.byProducer.length
    const totalItems = trendsData.totals.items
    const totalPolicies = trendsData.totals.households
    const avgItems = trendsData.byProducer.length > 0 ? totalItems / trendsData.byProducer.length : 0
    const avgPolicies = trendsData.byProducer.length > 0 ? totalPolicies / trendsData.byProducer.length : 0

    return {
      uniqueProducers,
      totalPolicies,
      totalItems,
      avgItems,
      avgPolicies
    }
  }, [trendsData])

  // Export CSV - hooks must be called unconditionally
  const exportToCSV = useCallback(() => {
    if (byProducer.length === 0) return

    const headers = ['Producer', 'Policies Sold (HH)', 'Items Sold', 'Attach Rate']
    const rows = byProducer.map(p => [
      p.producerName,
      p.households.toString(),
      p.items.toString(),
      p.households > 0 ? (p.items / p.households).toFixed(2) : '0.00'
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `producer_trends_${dateFrom}_to_${dateTo}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }, [byProducer, dateFrom, dateTo])

  const exportRef = useRef(exportToCSV)
  exportRef.current = exportToCSV

  const stableWrapperRef = useRef<(() => void) | null>(null)
  if (!stableWrapperRef.current) {
    stableWrapperRef.current = () => exportRef.current()
  }

  useEffect(() => {
    onExportReady?.(stableWrapperRef.current!)
  }, [onExportReady])

  const getFrameworkBadge = (status: 'Top' | 'Bottom' | 'Outside') => {
    const variants = {
      Top: { variant: 'default' as const, className: 'bg-green-600 hover:bg-green-700', icon: TrendingUp },
      Bottom: { variant: 'default' as const, className: 'bg-yellow-600 hover:bg-yellow-700', icon: Minus },
      Outside: { variant: 'default' as const, className: 'bg-red-600 hover:bg-red-700', icon: TrendingDown }
    }
    
    // Add defensive check - use fallback if status is invalid
    const config = variants[status] || variants['Outside']
    const Icon = config?.icon || Minus
    
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status || 'Unknown'}
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
            disabled={!producers || producers.length === 0 || isLoadingProducers}
            value={selectedProducers ? 'selected' : 'all'}
            onValueChange={(value) => {
              if (value === 'all') {
                setSelectedProducers(null)
              }
            }}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder={
                isLoadingProducers ? "Loading producers..." :
                producersError ? "Producers unavailable" :
                !producers ? "No producers found" :
                "All Producers"
              } />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Producers</SelectItem>
              {(producers || []).map((producer) => (
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Policies Sold (HH)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summaryStats.totalPolicies)}</div>
              <p className="text-xs text-muted-foreground mt-1">Avg: {summaryStats.avgPolicies.toFixed(1)}/producer</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summaryStats.totalItems)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Producer Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Producer Performance Summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Aggregated totals for {trendsData?.byProducer.length || 0} producers from {formatCTDate(dateFrom)} to {formatCTDate(dateTo)}
          </p>
        </CardHeader>
        <CardContent>
          {!trendsData || trendsData.byProducer.length === 0 ? (
            <EmptyState 
              message="No data for selected period"
              suggestion="Try selecting a different date range or producer"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producer</TableHead>
                    <TableHead className="text-right">Policies Sold (HH)</TableHead>
                    <TableHead className="text-right">Items Sold</TableHead>
                    <TableHead className="text-right">Attach Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trendsData.byProducer.map((producer) => (
                    <TableRow key={producer.producerName}>
                      <TableCell className="font-medium">{producer.producerName}</TableCell>
                      <TableCell className="text-right">{formatNumber(producer.households)}</TableCell>
                      <TableCell className="text-right">{formatNumber(producer.items)}</TableCell>
                      <TableCell className="text-right">
                        {producer.households > 0 ? (producer.items / producer.households).toFixed(2) : '0.00'}
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

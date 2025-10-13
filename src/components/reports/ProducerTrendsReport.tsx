import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useProducerTrends } from '@/hooks/useProducerTrends'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { QHHTrendChart } from '@/components/charts/QHHTrendChart'
import { FrameworkTrendChart } from '@/components/charts/FrameworkTrendChart'
import { ActivityMetricsChart } from '@/components/charts/ActivityMetricsChart'
import { SalesPerformanceChart } from '@/components/charts/SalesPerformanceChart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ProducerTrendsReportProps {
  selectedYear: number
  selectedMonth: number | null
}

const PRODUCER_COLORS: Record<string, string> = {
  'Kimberly': '#3B82F6',
  'Maria': '#10B981',
  'Rick': '#F59E0B',
  'Brandy': '#8B5CF6'
}

export const ProducerTrendsReport: React.FC<ProducerTrendsReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  // Fetch all active producers
  const { data: producers, isLoading: loadingProducers } = useQuery({
    queryKey: ['active-producers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producers')
        .select('id, display_name')
        .eq('active', true)
        .order('display_name')
      
      if (error) throw error
      return data || []
    }
  })

  // State for selected producers (default: all selected)
  const [selectedProducerIds, setSelectedProducerIds] = useState<string[]>([])
  const [compareMode, setCompareMode] = useState(true)
  const initialized = React.useRef(false)

  // Initialize selected producers when data loads
  React.useEffect(() => {
    if (producers && !initialized.current && selectedProducerIds.length === 0) {
      setSelectedProducerIds(producers.map(p => p.id))
      initialized.current = true
    }
  }, [producers, selectedProducerIds])

  // Fetch trend data
  const { data: trendsData, isLoading: loadingTrends, error: trendsError } = useProducerTrends(
    selectedProducerIds.length > 0 ? selectedProducerIds : null,
    selectedYear,
    selectedMonth
  )

  // Debug logging removed for cleaner code

  // Early return for invalid data
  if (!producers && !loadingProducers) {
    console.error('No producers data available')
    return <div className="flex items-center justify-center h-96"><p className="text-muted-foreground">Unable to load producers</p></div>
  }

  // Process data for charts
  const chartData = useMemo(() => {
    if (!trendsData || !producers) {
      return null
    }

    // Group by date
    const dateMap = new Map<string, any>()
    
    trendsData.forEach(row => {
      if (!row || !row.entry_date || !row.producer_name) {
        return
      }
      
      const date = row.entry_date
      
      if (!dateMap.has(date)) {
        dateMap.set(date, { date })
      }
      const dayData = dateMap.get(date)!
      
      // QHH data
      dayData[row.producer_name] = Number(row.qhh || 0)
      
      // Activity data
      dayData[`${row.producer_name}_dials`] = Number(row.outbound_dials || 0)
      dayData[`${row.producer_name}_talk`] = Number(row.talk_minutes || 0)
      
      // Sales data
      dayData[`${row.producer_name}_premium`] = Number(row.sold_premium || 0)
      dayData[`${row.producer_name}_items`] = Number(row.sold_items || 0)
    })

    const qhhData = Array.from(dateMap.values())

    // Framework status data - aggregate by date
    const frameworkMap = new Map<string, { date: string; Top: number; Bottom: number; Outside: number }>()
    trendsData.forEach(row => {
      if (!row || !row.entry_date) {
        return
      }
      
      const date = row.entry_date
      if (!frameworkMap.has(date)) {
        frameworkMap.set(date, { date, Top: 0, Bottom: 0, Outside: 0 })
      }
      const dayFramework = frameworkMap.get(date)!
      
      const status = row.framework_status
      if (status === 'Top' || status === 'Bottom' || status === 'Outside') {
        dayFramework[status] += 1
      } else {
        dayFramework['Outside'] += 1
      }
    })
    const frameworkData = Array.from(frameworkMap.values())

    return {
      qhhData,
      frameworkData,
      activityData: qhhData,
      salesData: qhhData
    }
  }, [trendsData, producers])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!trendsData || !producers) {
      return []
    }

    const producerMap = new Map<string, any>()
      
      trendsData.forEach(row => {
        if (!row || !row.producer_id || !row.producer_name) {
          console.warn('Invalid row in summary stats:', row)
          return
        }
        
        const id = row.producer_id
        if (!producerMap.has(id)) {
          producerMap.set(id, {
            producer_name: row.producer_name,
            days_worked: 0,
            total_qhh: 0,
            total_dials: 0,
            total_talk: 0,
            total_premium: 0,
            total_top: 0,
            total_days: 0
          })
        }
        const stats = producerMap.get(id)!
        stats.days_worked += 1
        stats.total_qhh += Number(row.qhh ?? 0)
        stats.total_dials += Number(row.outbound_dials ?? 0)
        stats.total_talk += Number(row.talk_minutes ?? 0)
        stats.total_premium += Number(row.sold_premium ?? 0)
        stats.total_top += Number(row.days_top ?? 0)
        stats.total_days += 1
      })

    return Array.from(producerMap.values()).map(stats => ({
      ...stats,
      avg_daily_qhh: stats.days_worked > 0 ? (stats.total_qhh / stats.days_worked).toFixed(2) : '0.00',
      avg_daily_dials: stats.days_worked > 0 ? (stats.total_dials / stats.days_worked).toFixed(0) : '0',
      avg_daily_talk: stats.days_worked > 0 ? (stats.total_talk / stats.days_worked).toFixed(0) : '0',
      framework_compliance: stats.total_days > 0 ? ((stats.total_top / stats.total_days) * 100).toFixed(1) : '0.0'
    }))
  }, [trendsData, producers])

  const selectedProducers = useMemo(() => {
    if (!producers) return []
    return producers
      .filter(p => selectedProducerIds.includes(p.id))
      .map(p => p.display_name)
  }, [producers, selectedProducerIds])

  const handleProducerToggle = (producerId: string) => {
    setSelectedProducerIds(prev =>
      prev.includes(producerId)
        ? prev.filter(id => id !== producerId)
        : [...prev, producerId]
    )
  }

  if (loadingProducers || loadingTrends) {
    return <Skeleton className="h-96 w-full" />
  }

  if (trendsError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-2">
          <p className="text-destructive text-lg">Error loading trend data</p>
          <p className="text-sm text-muted-foreground">{trendsError.message}</p>
          <p className="text-sm text-muted-foreground">
            Make sure the database migration has been applied.
          </p>
        </div>
      </div>
    )
  }

  // Check if there's any actual activity data
  const hasData = useMemo(() => {
    if (!trendsData || trendsData.length === 0) return false
    
    return trendsData.some(row => 
      (row.qhh ?? 0) > 0 || 
      (row.sold_items ?? 0) > 0 || 
      (row.sold_premium ?? 0) > 0
    )
  }, [trendsData])

  if (selectedProducerIds.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Please select at least one producer</p>
      </div>
    )
  }

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">No trend data available for selected period</p>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-lg">No activity recorded for this period</p>
          <p className="text-sm text-muted-foreground">Try selecting a different date range</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Producer Selection */}
            <div className="space-y-2">
              <Label>Select Producers</Label>
              <div className="flex flex-wrap gap-3">
                {producers?.map(producer => (
                  <div key={producer.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={producer.id}
                      checked={selectedProducerIds.includes(producer.id)}
                      onCheckedChange={() => handleProducerToggle(producer.id)}
                    />
                    <label
                      htmlFor={producer.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {producer.display_name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Compare Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="compare-mode"
                checked={compareMode}
                onCheckedChange={setCompareMode}
              />
              <Label htmlFor="compare-mode">Compare Producers</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Framework Status Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Framework Status Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <FrameworkTrendChart data={chartData.frameworkData} />
          </CardContent>
        </Card>

        {/* Chart 2: QHH Trend */}
        <Card>
          <CardHeader>
            <CardTitle>QHH Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <QHHTrendChart
              data={chartData.qhhData}
              producerColors={PRODUCER_COLORS}
              selectedProducers={selectedProducers}
            />
          </CardContent>
        </Card>

        {/* Chart 3: Sales Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesPerformanceChart
              data={chartData.salesData}
              producerColors={PRODUCER_COLORS}
              selectedProducers={selectedProducers}
            />
          </CardContent>
        </Card>

        {/* Chart 4: Activity Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityMetricsChart
              data={chartData.activityData}
              producerColors={PRODUCER_COLORS}
              selectedProducers={selectedProducers}
            />
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producer</TableHead>
                <TableHead className="text-right">Days Worked</TableHead>
                <TableHead className="text-right">Avg Daily QHH</TableHead>
                <TableHead className="text-right">Avg Daily Dials</TableHead>
                <TableHead className="text-right">Avg Daily Talk Time</TableHead>
                <TableHead className="text-right">Total Sold Premium</TableHead>
                <TableHead className="text-right">Framework Compliance %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryStats.map(stats => (
                <TableRow key={stats.producer_name}>
                  <TableCell className="font-medium">{stats.producer_name}</TableCell>
                  <TableCell className="text-right">{stats.days_worked}</TableCell>
                  <TableCell className="text-right">{stats.avg_daily_qhh}</TableCell>
                  <TableCell className="text-right">{stats.avg_daily_dials}</TableCell>
                  <TableCell className="text-right">{stats.avg_daily_talk}</TableCell>
                  <TableCell className="text-right">
                    ${stats.total_premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">{stats.framework_compliance}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

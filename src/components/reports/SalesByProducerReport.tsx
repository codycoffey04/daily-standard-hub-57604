import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useSalesByProducer, type SalesByProducerData } from '@/hooks/useSummariesData'
import { useMonthlySummary } from '@/hooks/useMonthlySummary'
import { Users, Target, TrendingUp, DollarSign, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SalesByProducerReportProps {
  selectedYear: number
  selectedMonth: number | null
}

type SortField = 'producer_name' | 'days_worked' | 'framework_compliance_pct' | 'avg_daily_qhh' | 'avg_daily_items' | 'total_sold_items' | 'total_sold_premium'
type SortDirection = 'asc' | 'desc'

const TrendArrow: React.FC<{ current?: number; previous?: number }> = ({ current, previous }) => {
  if (!current || !previous || previous === 0) return null
  
  const percentChange = ((current - previous) / previous) * 100
  
  if (percentChange > 5) {
    return <ArrowUp className="inline-block w-4 h-4 ml-1 text-green-600" />
  } else if (percentChange < -5) {
    return <ArrowDown className="inline-block w-4 h-4 ml-1 text-red-600" />
  }
  return <Minus className="inline-block w-4 h-4 ml-1 text-muted-foreground" />
}

const FrameworkStatusCell: React.FC<{ data: SalesByProducerData }> = ({ data }) => {
  const { days_top, days_bottom, days_outside, framework_compliance_pct } = data
  
  const badgeVariant = framework_compliance_pct >= 80 ? 'default' : framework_compliance_pct >= 50 ? 'secondary' : 'destructive'
  
  return (
    <div className="space-y-1">
      <div className="text-sm">
        <span className="font-semibold text-green-600">{days_top} Top</span>
        {' / '}
        <span className="font-semibold text-yellow-600">{days_bottom} Bottom</span>
        {' / '}
        <span className="font-semibold text-red-600">{days_outside} Outside</span>
      </div>
      <Badge variant={badgeVariant} className="text-xs">
        {(framework_compliance_pct ?? 0).toFixed(1)}% compliance
      </Badge>
    </div>
  )
}

export const SalesByProducerReport: React.FC<SalesByProducerReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  const { data: producersData, isLoading, error } = useSalesByProducer(selectedYear, selectedMonth)
  const { data: monthlySummary, isLoading: isSummaryLoading } = useMonthlySummary(selectedYear, selectedMonth)
  
  const [sortField, setSortField] = useState<SortField>('framework_compliance_pct')
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

  const summaryMetrics = useMemo(() => {
    if (!producersData) return null
    
    const activeProducers = producersData.length
    const avgCompliance = producersData.reduce((sum, p) => sum + (p.framework_compliance_pct ?? 0), 0) / (producersData.length || 1)
    const totalItems = producersData.reduce((sum, p) => sum + (p.total_sold_items ?? 0), 0)
    const totalPremium = producersData.reduce((sum, p) => sum + (p.total_sold_premium ?? 0), 0)
    
    const prevTotalItems = producersData.reduce((sum, p) => sum + (p.prev_total_sold_items ?? 0), 0)
    const prevAvgCompliance = producersData.reduce((sum, p) => sum + (p.prev_framework_compliance_pct ?? 0), 0) / (producersData.length || 1)
    
    return {
      activeProducers,
      avgCompliance,
      totalItems,
      totalPremium,
      prevTotalItems,
      prevAvgCompliance
    }
  }, [producersData])

  const teamTotals = useMemo(() => {
    if (!producersData) return null
    
    return {
      days_worked: producersData.reduce((sum, p) => sum + (p.days_worked ?? 0), 0),
      days_top: producersData.reduce((sum, p) => sum + (p.days_top ?? 0), 0),
      days_bottom: producersData.reduce((sum, p) => sum + (p.days_bottom ?? 0), 0),
      days_outside: producersData.reduce((sum, p) => sum + (p.days_outside ?? 0), 0),
      total_qhh: monthlySummary?.total_qhh || 0,
      total_quotes: monthlySummary?.total_quotes || 0,
      total_sold_items: producersData.reduce((sum, p) => sum + (p.total_sold_items ?? 0), 0),
      total_sold_premium: producersData.reduce((sum, p) => sum + (p.total_sold_premium ?? 0), 0),
    }
  }, [producersData, monthlySummary])

  if (isLoading || isSummaryLoading) {
    return (
      <div className="space-y-6">
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
            Error loading sales data: {error.message}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!producersData || producersData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No producer data available for the selected period
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Producers Active</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics?.activeProducers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Avg Framework Compliance</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">
                {(summaryMetrics?.avgCompliance ?? 0).toFixed(1)}%
              </div>
              <TrendArrow 
                current={summaryMetrics?.avgCompliance} 
                previous={summaryMetrics?.prevAvgCompliance}
              />
            </div>
            <Badge 
              variant={
                (summaryMetrics?.avgCompliance || 0) >= 80 ? 'default' : 
                (summaryMetrics?.avgCompliance || 0) >= 50 ? 'secondary' : 
                'destructive'
              }
              className="mt-2"
            >
              {(summaryMetrics?.avgCompliance || 0) >= 80 ? 'Excellent' : 
               (summaryMetrics?.avgCompliance || 0) >= 50 ? 'Good' : 'Needs Improvement'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Items Sold</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">
                {(summaryMetrics?.totalItems ?? 0).toLocaleString()}
              </div>
              <TrendArrow 
                current={summaryMetrics?.totalItems} 
                previous={summaryMetrics?.prevTotalItems}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Premium Sold</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(summaryMetrics?.totalPremium ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Producer Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('producer_name')}
                  >
                    Producer {sortField === 'producer_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort('days_worked')}
                  >
                    Days Worked {sortField === 'days_worked' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('framework_compliance_pct')}
                  >
                    Framework Status {sortField === 'framework_compliance_pct' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort('avg_daily_qhh')}
                  >
                    Avg Daily QHH {sortField === 'avg_daily_qhh' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort('avg_daily_items')}
                  >
                    Avg Daily Items {sortField === 'avg_daily_items' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-right">Total QHH</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort('total_sold_items')}
                  >
                    Total Items {sortField === 'total_sold_items' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort('total_sold_premium')}
                  >
                    Total Premium {sortField === 'total_sold_premium' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((producer, index) => (
                  <TableRow key={producer.producer_id}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell className="font-medium">{producer.producer_name}</TableCell>
                    <TableCell className="text-right">{producer.days_worked}</TableCell>
                    <TableCell>
                      <FrameworkStatusCell data={producer} />
                    </TableCell>
                    <TableCell className="text-right">{(producer.avg_daily_qhh ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{(producer.avg_daily_items ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{(producer.total_qhh ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {(producer.total_sold_items ?? 0).toLocaleString()}
                      <TrendArrow current={producer.total_sold_items} previous={producer.prev_total_sold_items} />
                    </TableCell>
                    <TableCell className="text-right">
                      ${(producer.total_sold_premium ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Team Totals Row */}
                {teamTotals && (
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell></TableCell>
                    <TableCell>TEAM TOTALS</TableCell>
                    <TableCell className="text-right">{teamTotals.days_worked}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-green-600">{teamTotals.days_top} Top</span>
                        {' / '}
                        <span className="text-yellow-600">{teamTotals.days_bottom} Bottom</span>
                        {' / '}
                        <span className="text-red-600">{teamTotals.days_outside} Outside</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">{(teamTotals.total_qhh ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{(teamTotals.total_sold_items ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      ${(teamTotals.total_sold_premium ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

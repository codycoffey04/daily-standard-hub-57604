import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartLoading } from '@/components/ui/chart-loading'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useConversionFunnel, useProducers } from '@/hooks/useConversionFunnel'
import { useSourcesForSelection } from '@/hooks/useSourcesForSelection'
import { MonthYearPickers } from '@/components/MonthYearPickers'
import { TrendingDown, TrendingUp, Target, Activity } from 'lucide-react'

interface ConversionFunnelReportProps {
  selectedYear: number
  selectedMonth: number | null
  onExportReady?: (exportFn: () => void) => void
}

export const ConversionFunnelReport: React.FC<ConversionFunnelReportProps> = ({
  selectedYear,
  selectedMonth,
  onExportReady
}) => {
  const [year, setYear] = useState(selectedYear)
  const [month, setMonth] = useState<number | null>(selectedMonth)
  const [producerId, setProducerId] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState<string | null>(null)

  const { data: funnelData, isLoading: isFunnelLoading } = useConversionFunnel(year, month, producerId, sourceId)
  const { data: producers, isLoading: isProducersLoading } = useProducers()
  const { data: sources, isLoading: isSourcesLoading } = useSourcesForSelection()

  // Calculate conversion metrics
  const metrics = useMemo(() => {
    if (!funnelData || funnelData.length === 0) {
      return {
        overallConversion: 0,
        engagementRate: 0,
        quoteEfficiency: 0,
        closeRate: 0
      }
    }

    const dials = funnelData[0]?.stage_value || 0
    const conversations = funnelData[1]?.stage_value || 0
    const qhh = funnelData[2]?.stage_value || 0
    const sales = funnelData[3]?.stage_value || 0

    return {
      overallConversion: dials > 0 ? (sales / dials) * 100 : 0,
      engagementRate: dials > 0 ? (conversations / dials) * 100 : 0,
      quoteToSaleRate: qhh > 0 ? (sales / qhh) * 100 : 0,
      conversationCloseRate: conversations > 0 ? (sales / conversations) * 100 : 0
    }
  }, [funnelData])

  // Generate insights
  const insights = useMemo(() => {
    if (!funnelData || funnelData.length === 0) return []
    
    const insightsList: string[] = []
    
    // Find biggest drop-off (excluding first stage)
    const stagesWithDropoff = funnelData.filter(s => s.stage_number > 1)
    if (stagesWithDropoff.length > 0) {
      const maxDropOff = stagesWithDropoff.reduce((max, stage) => 
        stage.drop_off_rate > max.drop_off_rate ? stage : max
      )
      if (maxDropOff.drop_off_rate > 0) {
        insightsList.push(`Biggest drop-off: ${maxDropOff.stage_name} (-${maxDropOff.drop_off_rate.toFixed(1)}%)`)
      }
    }
    
    // Find best conversion (excluding first stage)
    if (stagesWithDropoff.length > 0) {
      const bestConversion = stagesWithDropoff.reduce((max, stage) => 
        stage.conversion_rate > max.conversion_rate ? stage : max
      )
      insightsList.push(`Best conversion: ${bestConversion.stage_name} (${bestConversion.conversion_rate.toFixed(1)}%)`)
    }
    
    // Overall efficiency
    const firstStage = funnelData[0]
    const lastStage = funnelData[funnelData.length - 1]
    if (firstStage.stage_value > 0) {
      const efficiency = (lastStage.stage_value / firstStage.stage_value) * 100
      insightsList.push(`Overall efficiency: ${lastStage.stage_value} out of ${firstStage.stage_value.toLocaleString()} dials become sales (${efficiency.toFixed(2)}%)`)
    }
    
    return insightsList
  }, [funnelData])

  // Get conversion rate color
  const getConversionColor = (rate: number) => {
    if (rate >= 50) return 'text-green-600 dark:text-green-400'
    if (rate >= 20) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const rows = useMemo(() => funnelData ?? [], [funnelData])

  // Export CSV - hooks must be called unconditionally
  const exportToCSV = useCallback(() => {
    if (rows.length === 0) return

    const headers = ['Stage', 'Volume', 'Conversion %', 'Drop-off Count', 'Drop-off %']
    const csvRows = rows.map(s => [
      s.stage_name,
      s.stage_value.toString(),
      s.conversion_rate.toFixed(1),
      s.drop_off_count.toString(),
      s.drop_off_rate.toFixed(1)
    ])

    const csvContent = [headers, ...csvRows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const monthStr = month ? `_${month.toString().padStart(2, '0')}` : ''
    link.download = `conversion_funnel_${year}${monthStr}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }, [rows, year, month])

  const exportRef = useRef(exportToCSV)
  exportRef.current = exportToCSV

  const stableWrapperRef = useRef<(() => void) | null>(null)
  if (!stableWrapperRef.current) {
    stableWrapperRef.current = () => exportRef.current()
  }

  useEffect(() => {
    onExportReady?.(stableWrapperRef.current!)
  }, [onExportReady])

  const isLoading = isFunnelLoading || isProducersLoading || isSourcesLoading
  const hasData = funnelData && funnelData.length > 0 && funnelData[0].stage_value > 0

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel Analysis</CardTitle>
          <CardDescription>Track how prospects move through your sales process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MonthYearPickers
              selectedYear={year}
              selectedMonth={month}
              onYearChange={setYear}
              onMonthChange={setMonth}
            />
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Producer</label>
              <Select value={producerId || 'all'} onValueChange={(v) => setProducerId(v === 'all' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Producers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Producers</SelectItem>
                  {producers?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Source</label>
              <Select value={sourceId || 'all'} onValueChange={(v) => setSourceId(v === 'all' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall Conversion</CardDescription>
            <CardTitle className="text-3xl">
              {isLoading ? <Skeleton className="h-9 w-20" /> : `${metrics.overallConversion.toFixed(2)}%`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Target className="h-4 w-4" />
              Sales per 100 dials
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Engagement Rate</CardDescription>
            <CardTitle className="text-3xl">
              {isLoading ? <Skeleton className="h-9 w-20" /> : `${metrics.engagementRate.toFixed(2)}%`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Activity className="h-4 w-4" />
              Dials to conversations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Quote to Sale Rate</CardDescription>
            <CardTitle className="text-3xl">
              {isLoading ? <Skeleton className="h-9 w-20" /> : `${metrics.quoteToSaleRate.toFixed(2)}%`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              QHH to closed sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversation Close Rate</CardDescription>
            <CardTitle className="text-3xl">
              {isLoading ? <Skeleton className="h-9 w-20" /> : `${metrics.conversationCloseRate.toFixed(2)}%`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Conversations to sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Funnel</CardTitle>
          <CardDescription>Visual representation of conversion stages</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartLoading />
          ) : !hasData ? (
            <EmptyState message="No activity data found for this period." />
          ) : (
            <div className="relative w-full max-w-3xl mx-auto py-8">
              {funnelData.map((stage, index) => {
                const widthPercent = (stage.stage_value / funnelData[0].stage_value) * 100
                const hue = 200 + index * 25 // Blue to green gradient
                
                return (
                  <div key={stage.stage_number} className="mb-3">
                    <div 
                      className="relative mx-auto transition-all hover:scale-[1.02] cursor-pointer group"
                      style={{
                        width: `${Math.max(widthPercent, 20)}%`,
                        background: `linear-gradient(135deg, hsl(${hue}, 65%, 50%), hsl(${hue}, 70%, 60%))`,
                        clipPath: 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)',
                        minHeight: '90px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                    >
                      <div className="text-white text-center z-10 px-4">
                        <div className="font-semibold text-sm mb-1">{stage.stage_name}</div>
                        <div className="text-3xl font-bold mb-1">{stage.stage_value.toLocaleString()}</div>
                        {index > 0 && (
                          <div className="text-sm opacity-90">{stage.conversion_rate.toFixed(1)}% converted</div>
                        )}
                      </div>
                      
                      {/* Tooltip on hover */}
                      {index > 0 && (
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-3 py-1 rounded shadow-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          Drop-off: {stage.drop_off_count.toLocaleString()} ({stage.drop_off_rate.toFixed(1)}%)
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stage Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stage Breakdown</CardTitle>
          <CardDescription>Detailed metrics for each funnel stage</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartLoading />
          ) : !hasData ? (
            <EmptyState message="No data available" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Conversion %</TableHead>
                  <TableHead className="text-right">Drop-off Count</TableHead>
                  <TableHead className="text-right">Drop-off %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funnelData.map((stage) => (
                  <TableRow key={stage.stage_number}>
                    <TableCell className="font-medium">{stage.stage_name}</TableCell>
                    <TableCell className="text-right">{stage.stage_value.toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-semibold ${stage.stage_number > 1 ? getConversionColor(stage.conversion_rate) : ''}`}>
                      {stage.conversion_rate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {stage.drop_off_count > 0 ? stage.drop_off_count.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {stage.drop_off_rate > 0 ? `${stage.drop_off_rate.toFixed(1)}%` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Insights Section */}
      {!isLoading && hasData && insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>Automated analysis of your conversion funnel</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-1">
                    {insight.includes('drop-off') ? (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <p className="text-sm flex-1">{insight}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

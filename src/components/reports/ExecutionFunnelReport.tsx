import React, { useState, useMemo } from 'react'
import { subDays, format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ChartLoading } from '@/components/ui/chart-loading'
import { EmptyState } from '@/components/ui/empty-state'
import { DateRangePicker } from '@/components/DateRangePicker'
import { 
  useExecutionFunnel, 
  useExecutionBenchmarks, 
  useExecutionEfficiency, 
  useProducersForExecution
} from '@/hooks/useExecutionFunnel'
import { useProducerExecutionLeaderboard } from '@/hooks/useProducerExecutionLeaderboard'
import { useSourcesForSelection } from '@/hooks/useSourcesForSelection'
import { DollarSign, Clock, Target, ArrowUpDown, Phone, Users, Home, FileCheck } from 'lucide-react'

// Helper functions for safe formatting
const safeToLocaleString = (value: number | null | undefined): string => {
  return value != null ? value.toLocaleString() : 'N/A'
}

const safeToFixed = (value: number | null | undefined, decimals: number = 2): string => {
  return value != null ? value.toFixed(decimals) : 'N/A'
}

interface ExecutionFunnelReportProps {
  selectedYear: number
  selectedMonth: number | null
}

export const ExecutionFunnelReport: React.FC<ExecutionFunnelReportProps> = () => {
  // Date range: default to last 90 days
  const [fromDate, setFromDate] = useState<Date>(subDays(new Date(), 90))
  const [toDate, setToDate] = useState<Date>(new Date())
  const [producerId, setProducerId] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string>('total_premium')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Format dates for API
  const fromDateStr = format(fromDate, 'yyyy-MM-dd')
  const toDateStr = format(toDate, 'yyyy-MM-dd')

  // Fetch all data using RPC functions
  const { data: funnelData, isLoading: isFunnelLoading } = useExecutionFunnel(fromDateStr, toDateStr, producerId, sourceId)
  const { data: benchmarks, isLoading: isBenchmarksLoading } = useExecutionBenchmarks(fromDateStr, toDateStr)
  const { data: efficiency, isLoading: isEfficiencyLoading } = useExecutionEfficiency(fromDateStr, toDateStr, producerId, sourceId)
  const { data: leaderboard, isLoading: isLeaderboardLoading } = useProducerExecutionLeaderboard(fromDateStr, toDateStr, sourceId)
  const { data: producers, isLoading: isProducersLoading } = useProducersForExecution()
  const { data: sources, isLoading: isSourcesLoading } = useSourcesForSelection()

  // Guidance badge helper
  const getGuidanceBadge = (guidance: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; className: string }> = {
      above_excellent: { variant: 'default', label: 'Excellent', className: 'bg-green-600 hover:bg-green-700' },
      normal_range: { variant: 'secondary', label: 'Normal', className: 'bg-yellow-600 hover:bg-yellow-700 text-white' },
      needs_attention: { variant: 'destructive', label: 'Needs Attention', className: '' },
      insufficient_volume: { variant: 'outline', label: 'Insufficient Data', className: 'text-gray-500' },
      no_benchmark: { variant: 'outline', label: 'Insufficient Data', className: 'text-gray-500' }
    }

    const config = variants[guidance] || variants.no_benchmark
    return (
      <Badge variant={config.variant} className={`text-xs ${config.className}`}>
        {config.label}
      </Badge>
    )
  }

  // Sort leaderboard
  const sortedLeaderboard = useMemo(() => {
    if (!leaderboard) return []
    const sorted = [...leaderboard].sort((a, b) => {
      const aVal = a[sortField as keyof typeof a] || 0
      const bVal = b[sortField as keyof typeof b] || 0
      return sortDirection === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
    })
    return sorted
  }, [leaderboard, sortField, sortDirection])

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const isLoading = isFunnelLoading || isProducersLoading || isSourcesLoading
  const hasData = funnelData && funnelData.length > 0 && funnelData[0].stage_value > 0

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Funnel Dashboard</CardTitle>
          <CardDescription>Analyze sales execution with benchmarks and efficiency metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="col-span-1 md:col-span-2">
              <DateRangePicker
                fromDate={fromDate}
                toDate={toDate}
                onFromDateChange={setFromDate}
                onToDateChange={setToDate}
              />
            </div>
            
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

      {/* Efficiency Metrics Cards */}
      {!isEfficiencyLoading && efficiency && efficiency.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {efficiency.filter(m => m.metric_value != null).map((metric) => (
            <Card key={metric.metric_name}>
              <CardHeader className="pb-2">
                <CardDescription>{metric.metric_name}</CardDescription>
                <CardTitle className="text-3xl">
                  {(metric.metric_unit === '$' || metric.metric_unit === 'dollars' || metric.metric_unit?.startsWith('$/')) && '$'}
                  {safeToLocaleString(metric.metric_value)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  {metric.metric_unit === '$' ? (
                    <DollarSign className="h-4 w-4" />
                  ) : metric.metric_unit === 'minutes' ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <Target className="h-4 w-4" />
                  )}
                  Efficiency metric
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Funnel</CardTitle>
          <CardDescription>5-stage sales execution pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartLoading />
          ) : !hasData ? (
            <EmptyState message="No activity data found for this period." />
          ) : (
            <div className="space-y-8">
              {/* Main Funnel: Stages 1-4 */}
              <div className="relative w-full max-w-3xl mx-auto py-8">
                {funnelData.slice(0, 4).map((stage, index) => {
                  const widthPercent = (stage.stage_value / funnelData[0].stage_value) * 100
                  const colors = [
                    { hue: 220, sat: 70, light: 55 },  // Dials - Blue
                    { hue: 190, sat: 65, light: 50 },  // QHH - Cyan
                    { hue: 160, sat: 70, light: 52 },  // SHH - Teal
                    { hue: 140, sat: 65, light: 48 },  // Policies - Green
                  ];
                  const color = colors[index];
                  const gradient = `linear-gradient(135deg, hsl(${color.hue}, ${color.sat}%, ${color.light}%), hsl(${color.hue}, ${color.sat + 5}%, ${color.light + 8}%))`;
                  
                  const icons = [
                    <Phone className="h-5 w-5 inline mr-1" />,
                    <Users className="h-5 w-5 inline mr-1" />,
                    <Home className="h-5 w-5 inline mr-1" />,
                    <FileCheck className="h-5 w-5 inline mr-1" />
                  ];
                  
                  return (
                    <div key={stage.stage_number} className="mb-6 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                      <div 
                        className="relative mx-auto transition-all hover:scale-[1.02] cursor-pointer group"
                        style={{
                          width: `${Math.max(widthPercent, 20)}%`,
                          background: gradient,
                          clipPath: 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)',
                          minHeight: '100px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.15), 0 4px 8px -2px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <div className="text-white text-center z-10 px-4">
                          <div className="text-xs opacity-75 mb-1">Stage {stage.stage_number}</div>
                          <div className="font-bold text-base mb-2 flex items-center justify-center">
                            {icons[index]}
                            {stage.stage_name}
                          </div>
                          <div className="text-4xl font-bold mb-2">
                            {safeToLocaleString(stage.stage_value)}
                          </div>
                          {index > 0 && stage.conversion_rate != null && (
                            <div className="text-sm font-semibold bg-white/20 rounded-full px-3 py-1 inline-block">
                              {stage.conversion_rate.toFixed(1)}% conversion
                            </div>
                          )}
                        </div>
                        
                        {index > 0 && stage.drop_off_count != null && stage.drop_off_rate != null && (
                          <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-4 py-2 rounded-lg shadow-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                            Drop-off: <span className="font-semibold">{safeToLocaleString(stage.drop_off_count)}</span> ({safeToFixed(stage.drop_off_rate, 1)}%)
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Premium Summary Card (Stage 5) */}
              {funnelData[4] && (
                <Card className="border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-950/20 dark:via-amber-950/20 dark:to-orange-950/20 animate-fade-in">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-full mb-4">
                        <DollarSign className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Total Premium Written</div>
                      <div className="text-5xl font-bold text-yellow-700 dark:text-yellow-400 mb-2">
                        ${safeToLocaleString(funnelData[4].stage_value)}
                      </div>
                      {funnelData[4].conversion_rate != null && (
                        <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-300">
                          Average: ${funnelData[4].conversion_rate.toFixed(0)} per policy
                        </div>
                      )}
                      {funnelData[3] && funnelData[3].stage_value > 0 && (
                        <div className="text-sm text-muted-foreground mt-4">
                          From {safeToLocaleString(funnelData[3].stage_value)} policies sold
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Producer Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Producer Execution Leaderboard</CardTitle>
          <CardDescription>Performance metrics with guidance benchmarks</CardDescription>
        </CardHeader>
        <CardContent>
          {isLeaderboardLoading ? (
            <ChartLoading />
          ) : !leaderboard || leaderboard.length === 0 ? (
            <EmptyState message="No producer data available" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producer</TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('total_dials')}>
                      Dials <ArrowUpDown className="inline h-3 w-3 ml-1" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('total_qhh')}>
                      QHH <ArrowUpDown className="inline h-3 w-3 ml-1" />
                    </TableHead>
                    <TableHead className="text-center cursor-pointer" onClick={() => toggleSort('quote_rate')}>
                      Quote Rate <ArrowUpDown className="inline h-3 w-3 ml-1" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('total_shh')}>
                      SHH <ArrowUpDown className="inline h-3 w-3 ml-1" />
                    </TableHead>
                    <TableHead className="text-center cursor-pointer" onClick={() => toggleSort('close_rate')}>
                      Close Rate <ArrowUpDown className="inline h-3 w-3 ml-1" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('total_items')}>
                      Items <ArrowUpDown className="inline h-3 w-3 ml-1" />
                    </TableHead>
                    <TableHead className="text-center cursor-pointer" onClick={() => toggleSort('attach_rate')}>
                      Attach Rate <ArrowUpDown className="inline h-3 w-3 ml-1" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('total_premium')}>
                      Premium <ArrowUpDown className="inline h-3 w-3 ml-1" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeaderboard.map((producer) => (
                    <TableRow key={producer.producer_id}>
                      <TableCell className="font-medium">{producer.producer_name}</TableCell>
                      <TableCell className="text-right">{safeToLocaleString(producer.total_dials)}</TableCell>
                      <TableCell className="text-right">{safeToLocaleString(producer.total_qhh)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="font-medium">{safeToFixed(producer.quote_rate, 2)}%</div>
                          {getGuidanceBadge(producer.quote_guidance)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{safeToLocaleString(producer.total_shh)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="font-medium">{safeToFixed(producer.close_rate, 2)}%</div>
                          {getGuidanceBadge(producer.close_guidance)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{safeToLocaleString(producer.total_items)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="font-medium">{safeToFixed(producer.attach_rate, 2)}</div>
                          {getGuidanceBadge(producer.attach_guidance)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {producer.total_premium != null ? `$${safeToLocaleString(producer.total_premium)}` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benchmarks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Benchmarks by Source</CardTitle>
          <CardDescription>Normal and excellent thresholds for key metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {isBenchmarksLoading ? (
            <ChartLoading />
          ) : !benchmarks || benchmarks.length === 0 ? (
            <EmptyState message="Insufficient data for benchmarks (requires minimum volume thresholds)" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-center">Pairs</TableHead>
                  <TableHead className="text-right">Quote Rate (Normal)</TableHead>
                  <TableHead className="text-right">Quote Rate (Excellent)</TableHead>
                  <TableHead className="text-right">Close Rate (Normal)</TableHead>
                  <TableHead className="text-right">Close Rate (Excellent)</TableHead>
                  <TableHead className="text-right">Attach Rate (Normal)</TableHead>
                  <TableHead className="text-right">Attach Rate (Excellent)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmarks.map((benchmark) => (
                  <TableRow key={benchmark.source_id}>
                    <TableCell className="font-medium">{benchmark.source_name}</TableCell>
                    <TableCell className="text-center">{benchmark.total_pairs}</TableCell>
                    <TableCell className="text-right">{safeToFixed(benchmark.quote_rate_normal, 2)}%</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400 font-semibold">
                      {safeToFixed(benchmark.quote_rate_excellent, 2)}%
                    </TableCell>
                    <TableCell className="text-right">{safeToFixed(benchmark.close_rate_normal, 2)}%</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400 font-semibold">
                      {safeToFixed(benchmark.close_rate_excellent, 2)}%
                    </TableCell>
                    <TableCell className="text-right">{safeToFixed(benchmark.attach_rate_normal, 2)}</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400 font-semibold">
                      {safeToFixed(benchmark.attach_rate_excellent, 2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

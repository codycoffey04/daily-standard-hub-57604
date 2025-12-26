import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
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
  useProducersForExecution
} from '@/hooks/useExecutionFunnel'
import { useProducerExecutionLeaderboard } from '@/hooks/useProducerExecutionLeaderboard'
import { useSourcesForSelection } from '@/hooks/useSourcesForSelection'
import { DollarSign, Clock, Target, ArrowUpDown, Phone, Users, Home, FileCheck, ChevronRight } from 'lucide-react'

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
  onExportReady?: (exportFn: (() => void) | null) => void
}

export const ExecutionFunnelReport: React.FC<ExecutionFunnelReportProps> = ({
  onExportReady
}) => {
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
  const { data: funnelData, isLoading: isFunnelLoading } = useExecutionFunnel(fromDateStr, toDateStr)
  const { data: benchmarks, isLoading: isBenchmarksLoading } = useExecutionBenchmarks(fromDateStr, toDateStr)
  const { data: leaderboard, isLoading: isLeaderboardLoading } = useProducerExecutionLeaderboard(
    fromDateStr, 
    toDateStr, 
    sourceId,
    0,  // minDials: 0 (show all producers)
    0,  // minQHH: 0 (show all producers)
    0   // minSHH: 0 (show all producers)
  )
  const { data: producers, isLoading: isProducersLoading } = useProducersForExecution()
  const { data: sources, isLoading: isSourcesLoading } = useSourcesForSelection()

  // NEW: chart-only data projection - do NOT mutate funnelData.stages
  const chartStages = useMemo(
    () => (funnelData?.stages ?? []).map(s => ({
      name: s.stage_name,
      value: s.stage_value,
    })),
    [funnelData]
  );

  // Dev guard: warn if any stage_value went missing (indicates mutation)
  if (process.env.NODE_ENV !== 'production') {
    const missing = funnelData?.stages?.find(s => typeof s.stage_value === 'undefined');
    if (missing) console.warn('ExecutionFunnel stages mutated; stage_value missing:', missing);
  }

  // Debug: Log funnel data to verify values
  React.useEffect(() => {
    if (funnelData?.stages) {
      console.log('🔍 FUNNEL DATA:', {
        stages: funnelData.stages.map(s => ({ name: s.stage_name, value: s.stage_value })),
        qhh: funnelData.stages[1]?.stage_value,
        premium: funnelData.stages[4]?.stage_value
      });
    }
  }, [funnelData]);

  // Derive efficiency metrics from funnel data (single source of truth)
  const derivedMetrics = useMemo(() => {
    if (!funnelData?.stages || funnelData.stages.length < 5) return [];
    
    const dials = funnelData.stages[0]?.stage_value || 0;
    const qhh = funnelData.stages[1]?.stage_value || 0;
    const policies = funnelData?.policies_sold ?? 0;  // Policies sold (for Sales stage)
    const items = funnelData?.items_sold ?? 0; // Items sold - using direct field from RPC
    const premium = funnelData.stages[4]?.stage_value || 0;
    const shh = funnelData.stages[2]?.stage_value || 0;  // Households sold (keep for calculations)
    
    // Base metrics from funnel
    const baseMetrics = [
      { metric_name: 'Total Dials', metric_value: dials, metric_unit: 'dials' },
      { metric_name: 'Total QHH', metric_value: qhh, metric_unit: 'households' },
      { metric_name: 'Total Sales', metric_value: policies, metric_unit: 'sales' },
      { metric_name: 'Total Items', metric_value: items, metric_unit: 'items' },
      { metric_name: 'Total Premium', metric_value: premium, metric_unit: 'dollars' },
    ];
    
    // Calculated efficiency metrics
    const calculatedMetrics = [
      { 
        metric_name: 'Premium per Dial', 
        metric_value: dials > 0 ? premium / dials : 0, 
        metric_unit: '$/dial' 
      },
      { 
        metric_name: 'Premium per Sale', 
        metric_value: policies > 0 ? premium / policies : 0, 
        metric_unit: '$/sale' 
      },
      { 
        metric_name: 'Items per Sale', 
        metric_value: policies > 0 ? items / policies : 0, 
        metric_unit: 'items/sale' 
      },
    ];
    
    return [...baseMetrics, ...calculatedMetrics];
  }, [funnelData]);

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

  // Export to CSV function
  const exportToCSV = useCallback(() => {
    if (!sortedLeaderboard || sortedLeaderboard.length === 0) {
      console.warn('No data to export')
      return
    }

    // Helper function to escape CSV values
    const escapeCSV = (value: string | number | null | undefined): string => {
      if (value == null) return ''
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Create CSV headers
    const headers = [
      'Producer',
      'Dials',
      'QHH',
      'Quote Rate %',
      'SHH',
      'Close Rate %',
      'Items',
      'Attach Rate',
      'Rank'
    ]

    // Create CSV rows
    const csvRows = sortedLeaderboard.map(producer => [
      escapeCSV(producer.producer_name),
      escapeCSV(producer.dials),
      escapeCSV(producer.qhh),
      escapeCSV(producer.dials > 0 ? ((producer.qhh / producer.dials) * 100).toFixed(2) : '0.00'),
      escapeCSV(producer.households_sold),
      escapeCSV(producer.qhh > 0 ? ((producer.households_sold / producer.qhh) * 100).toFixed(2) : '0.00'),
      escapeCSV(producer.items_sold),
      escapeCSV(producer.households_sold > 0 ? (producer.items_sold / producer.households_sold).toFixed(2) : '0.00'),
      escapeCSV(producer.rank_by_sales)
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
    const dateRange = fromDateStr && toDateStr 
      ? `_${fromDateStr}_to_${toDateStr}`.replace(/-/g, '')
      : ''
    link.download = `execution-funnel-leaderboard${dateRange}.csv`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }, [sortedLeaderboard, fromDateStr, toDateStr])

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

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const isLoading = isFunnelLoading || isProducersLoading || isSourcesLoading
  const hasData = funnelData?.stages && funnelData.stages.length > 0 && funnelData.stages[0].stage_value > 0

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

      {/* Efficiency Metrics Cards - Derived from Funnel Data */}
      {!isFunnelLoading && derivedMetrics && derivedMetrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {derivedMetrics.filter(m => m.metric_value != null).map((metric) => (
            <Card key={metric.metric_name}>
              <CardHeader className="pb-2">
                <CardDescription>{metric.metric_name}</CardDescription>
                <CardTitle className="text-3xl">
                  {(metric.metric_unit === '$' || metric.metric_unit === 'dollars' || metric.metric_unit?.startsWith('$/')) && '$'}
                  {metric.metric_unit?.startsWith('$/') || metric.metric_unit?.includes('/') 
                    ? safeToFixed(metric.metric_value, 2)
                    : safeToLocaleString(metric.metric_value)
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  {metric.metric_unit === '$' || metric.metric_unit === 'dollars' ? (
                    <DollarSign className="h-4 w-4" />
                  ) : metric.metric_unit === 'minutes' ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <Target className="h-4 w-4" />
                  )}
                  {metric.metric_unit?.includes('/') ? 'Efficiency ratio' : 'Total count'}
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
            <div className="space-y-4">
              {/* Horizontal Funnel: All 5 Stages - Uniform Size */}
              <div className="flex items-center gap-2 py-6 overflow-x-auto">
                {funnelData.stages.map((stage, index) => {
                  // Colors for each stage
                  const colors = [
                    { hue: 220, sat: 70, light: 55 },  // Dials - Blue
                    { hue: 190, sat: 65, light: 50 },  // QHH - Cyan
                    { hue: 160, sat: 70, light: 52 },  // SHH - Teal
                    { hue: 140, sat: 65, light: 48 },  // Policies - Green
                    { hue: 45, sat: 75, light: 50 },   // Premium - Gold
                  ];
                  const color = colors[index];
                  const gradient = `linear-gradient(135deg, hsl(${color.hue}, ${color.sat}%, ${color.light}%), hsl(${color.hue}, ${color.sat + 5}%, ${color.light + 8}%))`;
                  
                  // Icons
                  const icons = [
                    <Phone className="h-4 w-4" />,
                    <Users className="h-4 w-4" />,
                    <Home className="h-4 w-4" />,
                    <FileCheck className="h-4 w-4" />,
                    <DollarSign className="h-4 w-4" />
                  ];
                  
                  return (
                    <div key={stage.stage_number} className="relative group animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                      <div 
                        className="relative transition-all hover:scale-[1.02] cursor-pointer"
                        style={{
                          width: '180px',
                          height: '160px',
                          background: gradient,
                          borderRadius: '8px',
                          boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.15), 0 4px 8px -2px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <div className={`text-white text-center z-10 flex flex-col h-full ${index === 0 ? 'justify-center' : 'justify-between'} py-2 px-3`}>
                          {/* Top: Stage label */}
                          <div className="text-base font-bold text-white/95 drop-shadow">Stage {stage.stage_number}</div>
                          
                          {/* Center: Large value and stage name */}
                          <div>
                            <div className="text-3xl font-bold leading-tight mb-1 drop-shadow-md">
                              {index === 4 ? '$' : ''}
                              {safeToLocaleString(
                                index === 2 ? (funnelData?.policies_sold ?? 0) : stage.stage_value
                              )}
                            </div>
                            
                            {/* Stage name with icon */}
                            <div className="text-base font-bold flex items-center justify-center gap-2 text-white drop-shadow">
                              {icons[index]}
                              <span>{stage.stage_name}</span>
                            </div>
                          </div>
                          
                          {/* Bottom: Conversion rate or metric */}
                {index > 0 && stage.conversion_rate != null && (
                  <div className="text-sm font-extrabold text-white drop-shadow-md">
                    {index === 3 ? (
                      // Stage 4: Items Sold - Show attach rate as multiplier
                      <div className="flex flex-col items-center gap-0">
                        <div className="text-base">{(stage.conversion_rate / 100).toFixed(1)}x</div>
                        <div className="text-[10px] font-normal" style={{ color: '#FFFFFF' }}>attach rate</div>
                      </div>
                    ) : index === 4 ? (
                      // Stage 5: Premium - Show per household
                      <div className="flex flex-col items-center gap-0">
                        <div className="text-[10px] font-normal" style={{ color: '#FFFFFF' }}>per household</div>
                        <div className="text-base">${(funnelData.stages[2]?.stage_value > 0 
                          ? stage.stage_value / funnelData.stages[2].stage_value 
                          : 0).toFixed(0)}</div>
                      </div>
                    ) : index === 2 ? (
                      // Stage 3: Show policies/QHH conversion
                      `${((funnelData?.policies_sold ?? 0) / (funnelData.stages[1]?.stage_value || 1) * 100).toFixed(1)}%`
                    ) : (
                      // Stage 2: Show percentage
                      `${stage.conversion_rate.toFixed(1)}%`
                    )}
                  </div>
                )}
                        </div>
                      </div>
                      
                      {/* Hover tooltip for drop-off */}
                      {index > 0 && index < 4 && stage.drop_off_count != null && stage.drop_off_rate != null && (
                        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-3 py-1.5 rounded-lg shadow-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                          Drop-off: <span className="font-semibold">{safeToLocaleString(stage.drop_off_count)}</span> ({safeToFixed(stage.drop_off_rate, 1)}%)
                        </div>
                      )}
                      
                      {/* Arrow between stages */}
                      {index < 4 && (
                        <ChevronRight className="absolute -right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                      )}
                    </div>
                  );
                })}
              </div>
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
                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('dials')}>
                      Dials <ArrowUpDown className="inline h-3 w-3 ml-1" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('qhh')}>
                      QHH <ArrowUpDown className="inline h-3 w-3 ml-1" />
                    </TableHead>
                    <TableHead className="text-center">
                      Quote Rate
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('households_sold')}>
                      SHH <ArrowUpDown className="inline h-3 w-3 ml-1" />
                    </TableHead>
                    <TableHead className="text-center">
                      Close Rate
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('items_sold')}>
                      Items <ArrowUpDown className="inline h-3 w-3 ml-1" />
                    </TableHead>
                    <TableHead className="text-center">
                      Attach Rate
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('rank_by_sales')}>
                      Rank <ArrowUpDown className="inline h-3 w-3 ml-1" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeaderboard.map((producer) => (
                    <TableRow key={producer.producer_id}>
                      <TableCell className="font-medium">{producer.producer_name}</TableCell>
                      <TableCell className="text-right">{safeToLocaleString(producer.dials)}</TableCell>
                      <TableCell className="text-right">{safeToLocaleString(producer.qhh)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="font-medium">
                            {producer.dials > 0 ? safeToFixed((producer.qhh / producer.dials) * 100, 2) : '0.00'}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{safeToLocaleString(producer.households_sold)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="font-medium">
                            {producer.qhh > 0 ? safeToFixed((producer.households_sold / producer.qhh) * 100, 2) : '0.00'}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{safeToLocaleString(producer.items_sold)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="font-medium">
                            {producer.households_sold > 0 ? safeToFixed(producer.items_sold / producer.households_sold, 2) : '0.00'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        #{producer.rank_by_sales}
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
          <CardDescription>Dynamic percentile-based thresholds (50th = Normal, 75th = Excellent)</CardDescription>
        </CardHeader>
        <CardContent>
          {isBenchmarksLoading ? (
            <ChartLoading />
          ) : (() => {
              console.log('BENCHMARK DEBUG:', {
                hasData: benchmarks && benchmarks.length > 0,
                dataLength: benchmarks?.length,
                actualData: benchmarks,
                thresholds: { min_pair_qhh: 10, min_pair_shh: 0, min_pair_dials: 100 }
              });
              
              return !benchmarks || benchmarks.length === 0 ? (
                <EmptyState message="Insufficient data for benchmarks (requires minimum volume thresholds)" />
              ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-center">Producers</TableHead>
                  <TableHead className="text-right">Quote Rate (Normal)</TableHead>
                  <TableHead className="text-right">Quote Rate (Excellent)</TableHead>
                  <TableHead className="text-right">Close Rate (Normal)</TableHead>
                  <TableHead className="text-right">Close Rate (Excellent)</TableHead>
                  <TableHead className="text-right">Attach Rate (Normal)</TableHead>
                  <TableHead className="text-right">Attach Rate (Excellent)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmarks.map((benchmark, idx) => {
                  // DEBUG: Log raw values before formatting
                  if (idx === 0) {
                    console.log('🎨 DISPLAY DEBUG (first benchmark):', {
                      source: benchmark.sourceName,
                      raw_object: benchmark,
                      raw_quote_normal: benchmark.quoteRateNormal,
                      raw_quote_excellent: benchmark.quoteRateExcellent,
                      raw_close_normal: benchmark.closeRateNormal,
                      raw_close_excellent: benchmark.closeRateExcellent,
                      raw_attach_normal: benchmark.attachRateNormal,
                      raw_attach_excellent: benchmark.attachRateExcellent,
                      typeof_quote_normal: typeof benchmark.quoteRateNormal,
                      displayed_quote_normal: safeToFixed(benchmark.quoteRateNormal, 2),
                      displayed_quote_excellent: safeToFixed(benchmark.quoteRateExcellent, 2),
                    });
                  }
                  
                  return (
                    <TableRow key={benchmark.sourceId}>
                      <TableCell className="font-medium">{benchmark.sourceName}</TableCell>
                      <TableCell className="text-center">{benchmark.totalPairs}</TableCell>
                      <TableCell className="text-right">{safeToFixed(benchmark.quoteRateNormal, 2)}%</TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400 font-semibold">
                        {safeToFixed(benchmark.quoteRateExcellent, 2)}%
                      </TableCell>
                      <TableCell className="text-right">{safeToFixed(benchmark.closeRateNormal, 2)}%</TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400 font-semibold">
                        {safeToFixed(benchmark.closeRateExcellent, 2)}%
                      </TableCell>
                      <TableCell className="text-right">{safeToFixed(benchmark.attachRateNormal, 2)}</TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400 font-semibold">
                        {safeToFixed(benchmark.attachRateExcellent, 2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
              );
            })()}
        </CardContent>
      </Card>
    </div>
  )
}

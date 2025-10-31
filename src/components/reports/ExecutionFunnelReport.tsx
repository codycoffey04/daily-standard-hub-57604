import React, { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ChartLoading } from '@/components/ui/chart-loading'
import { EmptyState } from '@/components/ui/empty-state'
import { DateRangePicker } from '@/components/DateRangePicker'
import { getDateRange } from '@/hooks/useSummariesData'
import { useExecutionFunnel } from '@/hooks/useExecutionFunnel'
import { useProducerExecutionLeaderboard } from '@/hooks/useProducerExecutionLeaderboard'
import { useSourcesForSelection } from '@/hooks/useSourcesForSelection'
import { useProducersForSelection } from '@/hooks/useProducersForSelection'
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
}

export const ExecutionFunnelReport: React.FC<ExecutionFunnelReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  // Calculate default date range from parent's selected month/year
  const getDefaultDateRange = () => {
    const { startDate, endDate } = getDateRange(selectedYear, selectedMonth)
    return {
      fromDate: new Date(startDate),
      toDate: new Date(endDate)
    }
  }

  const defaultRange = getDefaultDateRange()

  // Date state: initialized from parent props, but can be overridden by user
  const [fromDate, setFromDate] = useState<Date>(defaultRange.fromDate)
  const [toDate, setToDate] = useState<Date>(defaultRange.toDate)

  const [producerId, setProducerId] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string>('total_premium')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Format dates for API calls
  const fromDateStr = format(fromDate, 'yyyy-MM-dd')
  const toDateStr = format(toDate, 'yyyy-MM-dd')

  // Sync with parent's month/year selection when it changes
  useEffect(() => {
    const newRange = getDefaultDateRange()
    setFromDate(newRange.fromDate)
    setToDate(newRange.toDate)
  }, [selectedYear, selectedMonth])

  // Fetch all data using RPC functions
  const { data: funnelDataRaw, loading: isFunnelLoading } = useExecutionFunnel({ from_date: fromDateStr, to_date: toDateStr })
  const { data: leaderboard, loading: isLeaderboardLoading } = useProducerExecutionLeaderboard({ 
    from_date: fromDateStr, 
    to_date: toDateStr, 
    source_filter: sourceId,
    min_dials: 50,
    min_qhh: 10,
    min_shh: 3
  })
  const { data: producers, isLoading: isProducersLoading } = useProducersForSelection()
  const { data: sources, isLoading: isSourcesLoading } = useSourcesForSelection()

  // Transform raw totals into stages format for backward compatibility
  const funnelData = React.useMemo(() => {
    if (!funnelDataRaw) return null;
    return {
      stages: [
        { stage_number: 1, stage_name: 'Dials', stage_value: funnelDataRaw.dials, conversion_rate: 100, drop_off_count: 0, drop_off_rate: 0 },
        { stage_number: 2, stage_name: 'QHH', stage_value: funnelDataRaw.qhh, conversion_rate: funnelDataRaw.dials > 0 ? (funnelDataRaw.qhh / funnelDataRaw.dials * 100) : 0, drop_off_count: funnelDataRaw.dials - funnelDataRaw.qhh, drop_off_rate: funnelDataRaw.dials > 0 ? ((funnelDataRaw.dials - funnelDataRaw.qhh) / funnelDataRaw.dials * 100) : 0 },
        { stage_number: 3, stage_name: 'SHH', stage_value: funnelDataRaw.householdsSold, conversion_rate: funnelDataRaw.qhh > 0 ? (funnelDataRaw.householdsSold / funnelDataRaw.qhh * 100) : 0, drop_off_count: funnelDataRaw.qhh - funnelDataRaw.householdsSold, drop_off_rate: funnelDataRaw.qhh > 0 ? ((funnelDataRaw.qhh - funnelDataRaw.householdsSold) / funnelDataRaw.qhh * 100) : 0 },
        { stage_number: 4, stage_name: 'Items', stage_value: funnelDataRaw.policiesSold, conversion_rate: funnelDataRaw.householdsSold > 0 ? (funnelDataRaw.policiesSold / funnelDataRaw.householdsSold * 100) : 0, drop_off_count: 0, drop_off_rate: 0 },
        { stage_number: 5, stage_name: 'Premium', stage_value: funnelDataRaw.linesQuoted, conversion_rate: funnelDataRaw.householdsSold > 0 ? (funnelDataRaw.linesQuoted / funnelDataRaw.householdsSold) : 0, drop_off_count: 0, drop_off_rate: 0 }
      ],
      qhh: funnelDataRaw.qhh
    };
  }, [funnelDataRaw]);

  // Debug: Log funnel data to verify values
  React.useEffect(() => {
    if (funnelData?.stages) {
      console.log('🔍 FUNNEL DATA:', {
        stages: funnelData.stages.map(s => ({ name: s.stage_name, value: s.stage_value })),
        qhh: funnelData.stages[1]?.stage_value
      });
    }
  }, [funnelData]);

  // Derive efficiency metrics from funnel data (single source of truth)
  const derivedMetrics = useMemo(() => {
    if (!funnelData?.stages || funnelData.stages.length < 5) return [];
    
    const dials = funnelData.stages[0]?.stage_value || 0;
    const qhh = funnelData.stages[1]?.stage_value || 0;
    const shh = funnelData.stages[2]?.stage_value || 0;  // Sales (Sold Households)
    const items = funnelData.stages[3]?.stage_value || 0; // Policies
    const premium = funnelData.stages[4]?.stage_value || 0;
    
    // Base metrics from funnel
    const baseMetrics = [
      { metric_name: 'Total Dials', metric_value: dials, metric_unit: 'dials' },
      { metric_name: 'Total QHH', metric_value: qhh, metric_unit: 'households' },
      { metric_name: 'Total Sales', metric_value: shh, metric_unit: 'sales' },
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
        metric_value: shh > 0 ? premium / shh : 0, 
        metric_unit: '$/sale' 
      },
      { 
        metric_name: 'Items per Sale', 
        metric_value: shh > 0 ? items / shh : 0, 
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
                              {index === 4 ? '$' : ''}{safeToLocaleString(stage.stage_value)}
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
                    ) : (
                      // Stages 2 & 3: Show percentage
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
                    <TableRow key={producer.producerId}>
                      <TableCell className="font-medium">{producer.producerName}</TableCell>
                      <TableCell className="text-right">{safeToLocaleString(producer.dials)}</TableCell>
                      <TableCell className="text-right">{safeToLocaleString(producer.qhh)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="font-medium">{safeToFixed(producer.quoteRate, 2)}%</div>
                          {producer.quoteGuidance && getGuidanceBadge(producer.quoteGuidance)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{safeToLocaleString(producer.policiesSold)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="font-medium">{safeToFixed(producer.closeRate, 2)}%</div>
                          {producer.closeGuidance && getGuidanceBadge(producer.closeGuidance)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{safeToLocaleString(producer.itemsSold)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="font-medium">{safeToFixed(producer.attachRate, 2)}</div>
                          {producer.attachGuidance && getGuidanceBadge(producer.attachGuidance)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {producer.totalPremium != null ? `$${safeToLocaleString(producer.totalPremium)}` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benchmarks Table - Removed since not available in new hooks */}
    </div>
  )
}

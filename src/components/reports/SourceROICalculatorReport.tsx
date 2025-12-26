import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSourceROI, SourceROIData } from '@/hooks/useSummariesData'
import { ChartLoading } from '@/components/ui/chart-loading'
import { EmptyState } from '@/components/ui/empty-state'
import { formatNumber, cn } from '@/lib/utils'
import { AlertCircle, ArrowUpDown, DollarSign, Target, TrendingUp, FileSpreadsheet, Pencil } from 'lucide-react'
import { CostManagementModal } from '@/components/CostManagementModal'

interface SourceROICalculatorReportProps {
  selectedYear: number
  selectedMonth: number | null
  onExportReady?: (exportFn: (() => void) | null) => void
}

export const SourceROICalculatorReport: React.FC<SourceROICalculatorReportProps> = ({
  selectedYear,
  selectedMonth,
  onExportReady
}) => {
  const [meetingVCGoal, setMeetingVCGoal] = useState(true)
  const [sortColumn, setSortColumn] = useState<keyof SourceROIData>('roi')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [costModalSource, setCostModalSource] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading, error } = useSourceROI(
    selectedYear,
    selectedMonth,
    meetingVCGoal
  )

  // Derive data safely even when data is undefined
  const rows = useMemo(() => data ?? [], [data])

  const formatCurrency = (value: number): string => `$${formatNumber(Math.round(value))}`
  
  const formatNullable = (
    value: number | null,
    formatter: (v: number) => string = (v) => formatNumber(v)
  ): string => {
    return value === null ? '—' : formatter(value)
  }

  const getROIColor = (roi: number | null): string => {
    if (roi === null) return 'bg-muted text-muted-foreground'
    if (roi >= 2.0) return 'bg-green-500/20 text-green-700 dark:text-green-400'
    if (roi >= 0.5) return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
    return 'bg-red-500/20 text-red-700 dark:text-red-400'
  }

  const getRecommendationBadge = (recommendation: string | null) => {
    if (!recommendation) return <Badge variant="outline">—</Badge>

    switch (recommendation) {
      case 'Scale 🚀':
        return <Badge className="bg-green-600 text-white hover:bg-green-700">Scale 🚀</Badge>
      case 'Watch 👀':
        return <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">Watch 👀</Badge>
      case 'Fix or Pause ⚠️':
        return <Badge variant="destructive">Fix or Pause ⚠️</Badge>
      case 'No Cost Data':
        return <Badge variant="outline">No Cost Data</Badge>
      case 'No Sales Yet':
        return <Badge variant="outline">No Sales Yet</Badge>
      default:
        return <Badge variant="outline">{recommendation}</Badge>
    }
  }

  const handleSort = (column: keyof SourceROIData) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const sortedData = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]

      // Handle NULL values (always sort to bottom)
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1

      const comparison = aVal > bVal ? 1 : -1
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [rows, sortColumn, sortDirection])

  // Calculate summary metrics
  const totalSpend = useMemo(() => rows.reduce((sum, item) => sum + (item.spend || 0), 0), [rows])
  const totalQHH = useMemo(() => rows.reduce((sum, item) => sum + item.qhh, 0), [rows])
  const avgCostPerQHH = totalQHH > 0 ? totalSpend / totalQHH : 0
  const sourcesWithCost = useMemo(() => rows.filter(item => (item.spend || 0) > 0).length, [rows])

  // Export to CSV function - all hooks MUST be called before any early returns
  const exportToCSV = useCallback(() => {
    if (sortedData.length === 0) {
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

    const headers = [
      'Source Name',
      'QHH',
      'Quotes',
      'Items',
      'Spend',
      'Cost/QHH',
      'Cost/Item',
      'Sold Premium',
      'LTV Estimate',
      'ROI %',
      'Recommendation'
    ]

    const csvRows = sortedData.map(row => [
      escapeCSV(row.source_name),
      escapeCSV(row.qhh),
      escapeCSV(row.quotes),
      escapeCSV(row.items),
      escapeCSV(row.spend ? Math.round(row.spend) : ''),
      escapeCSV(row.cost_per_qhh ? Math.round(row.cost_per_qhh) : ''),
      escapeCSV(row.cost_per_item ? Math.round(row.cost_per_item) : ''),
      escapeCSV(row.sold_premium_total ? Math.round(row.sold_premium_total) : ''),
      escapeCSV(row.ltv_estimate ? Math.round(row.ltv_estimate) : ''),
      escapeCSV(row.roi !== null ? (row.roi * 100).toFixed(0) : ''),
      escapeCSV(row.recommendation || '')
    ])

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const monthStr = selectedMonth ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}` : `${selectedYear}`
    link.download = `source-roi-calculator_${monthStr}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }, [sortedData, selectedYear, selectedMonth])

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

  // Early returns AFTER all hooks
  if (isLoading) return <ChartLoading />

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <div>
            <p className="text-lg font-medium text-foreground">Error loading data</p>
            <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
          </div>
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      {/* ROI Assumptions Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commission Structure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="vc-goal" className="text-base">
                Meeting VC Goal?
              </Label>
              <p className="text-sm text-muted-foreground">
                {meetingVCGoal 
                  ? "Commission: Year 1 = 22% NB, Years 2-3 = 7% renewals (3yr retention)"
                  : "Commission: Year 1 = 8% NB, Years 2-3 = 7% renewals (3yr retention)"
                }
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${!meetingVCGoal ? 'text-foreground' : 'text-muted-foreground'}`}>
                No (8% NB)
              </span>
              <Switch
                id="vc-goal"
                checked={meetingVCGoal}
                onCheckedChange={setMeetingVCGoal}
              />
              <span className={`text-sm font-medium ${meetingVCGoal ? 'text-foreground' : 'text-muted-foreground'}`}>
                Yes (22% NB)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
            <p className="text-xs text-muted-foreground">Across all sources</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total QHH</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalQHH)}</div>
            <p className="text-xs text-muted-foreground">Quoted households</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/QHH</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgCostPerQHH)}</div>
            <p className="text-xs text-muted-foreground">Per quoted household</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sources with Cost Data</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sourcesWithCost}</div>
            <p className="text-xs text-muted-foreground">Out of {rows.length} sources</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Source ROI Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort('source_name')}>
                      Source
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('qhh')}>
                      QHH
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('quotes')}>
                      Quotes
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('items')}>
                      Items
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('spend')}>
                      Spend
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('cost_per_qhh')}>
                      Cost/QHH
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('cost_per_item')}>
                      Cost/Item
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('sold_premium_total')}>
                      Sold Premium
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('ltv_estimate')}>
                      LTV Est
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('roi')}>
                      ROI
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row) => (
                  <TableRow key={row.source_id}>
                    <TableCell className="font-medium">{row.source_name}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.qhh)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.quotes)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.items)}</TableCell>
                    <TableCell className="text-right">{formatNullable(row.spend, formatCurrency)}</TableCell>
                    <TableCell className="text-right">{formatNullable(row.cost_per_qhh, formatCurrency)}</TableCell>
                    <TableCell className="text-right">{formatNullable(row.cost_per_item, formatCurrency)}</TableCell>
                    <TableCell className="text-right">{formatNullable(row.sold_premium_total, formatCurrency)}</TableCell>
                    <TableCell className="text-right">{formatNullable(row.ltv_estimate, formatCurrency)}</TableCell>
                    <TableCell className="text-right">
                      <div className={cn(
                        "inline-flex items-center justify-center px-2 py-1 rounded font-medium",
                        getROIColor(row.roi)
                      )}>
                        {row.roi === null
                          ? '—'
                          : `${(row.roi * 100).toFixed(0)}%`
                        }
                      </div>
                    </TableCell>
                    <TableCell>{getRecommendationBadge(row.recommendation)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCostModalSource({ id: row.source_id, name: row.source_name })}
                        title="Manage costs"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cost Management Modal */}
      {costModalSource && (
        <CostManagementModal
          sourceId={costModalSource.id}
          sourceName={costModalSource.name}
          isOpen={!!costModalSource}
          onClose={() => setCostModalSource(null)}
          currentFilterYear={selectedYear}
          currentFilterMonth={selectedMonth}
        />
      )}
    </div>
  )
}
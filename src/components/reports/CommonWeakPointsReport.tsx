import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ReviewsEmptyState } from '@/components/ui/reviews-empty-state'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts'
import { AlertCircle, TrendingUp, Users, Target, Activity } from 'lucide-react'
import { useCommonWeakPoints, WeakPoint } from '@/hooks/useCommonWeakPoints'
import { useSourcesForSelection } from '@/hooks/useSourcesForSelection'

interface CommonWeakPointsReportProps {
  selectedYear: number
  selectedMonth: number | null
}

const CommonWeakPointsReport: React.FC<CommonWeakPointsReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  const [producerFilter, setProducerFilter] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<keyof WeakPoint>('frequency')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const { data: weakPoints, isLoading, error } = useCommonWeakPoints(
    selectedYear,
    selectedMonth,
    producerFilter
  )

  const { data: producers } = useSourcesForSelection()

  const handleSort = (column: keyof WeakPoint) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const getSeverityColor = (frequency: number): string => {
    if (frequency >= 5) return '#EF4444' // red
    if (frequency >= 3) return '#F59E0B' // orange
    return '#FCD34D' // yellow
  }

  const filteredAndSortedData = useMemo(() => {
    if (!weakPoints) return []
    
    let filtered = weakPoints.filter(point =>
      point.gap_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    filtered.sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      const multiplier = sortDirection === 'asc' ? 1 : -1
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * multiplier
      }
      return ((aVal as number) - (bVal as number)) * multiplier
    })

    return filtered
  }, [weakPoints, searchTerm, sortColumn, sortDirection])

  const summaryStats = useMemo(() => {
    if (!weakPoints || weakPoints.length === 0) return null

    const totalGaps = weakPoints.length
    const totalOccurrences = weakPoints.reduce((sum, point) => sum + point.frequency, 0)
    const mostCommon = weakPoints[0]
    
    // Calculate average gaps per review (approximate based on total occurrences)
    const avgGapsPerReview = totalOccurrences > 0 ? (totalOccurrences / 8).toFixed(1) : '0'

    return {
      totalGaps,
      totalOccurrences,
      mostCommon,
      avgGapsPerReview
    }
  }, [weakPoints])

  const insights = useMemo(() => {
    if (!weakPoints || weakPoints.length === 0) return []

    const insights: string[] = []

    // Top 3 gaps percentage
    if (weakPoints.length >= 3) {
      const top3Frequency = weakPoints.slice(0, 3).reduce((sum, p) => sum + p.frequency, 0)
      const totalFrequency = weakPoints.reduce((sum, p) => sum + p.frequency, 0)
      const percentage = ((top3Frequency / totalFrequency) * 100).toFixed(0)
      insights.push(`Top 3 gaps account for ${percentage}% of all issues`)
    }

    // Most affected producer
    const producerGapCounts = new Map<string, number>()
    weakPoints.forEach(point => {
      const names = point.producer_names.split(', ')
      names.forEach(name => {
        producerGapCounts.set(name, (producerGapCounts.get(name) || 0) + point.frequency)
      })
    })
    const mostAffectedProducer = Array.from(producerGapCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]
    if (mostAffectedProducer) {
      insights.push(`${mostAffectedProducer[0]} needs the most coaching support (${mostAffectedProducer[1]} gaps)`)
    }

    // Team-wide opportunity
    if (weakPoints.length > 0 && weakPoints[0].affected_producers >= 3) {
      insights.push(`${weakPoints[0].gap_name} is a team-wide training opportunity (affects ${weakPoints[0].affected_producers} producers)`)
    }

    return insights
  }, [weakPoints])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load common weak points data. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  if (!weakPoints || weakPoints.length === 0) {
    return <ReviewsEmptyState />
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter weak points by producer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={producerFilter || 'all'} onValueChange={(val) => setProducerFilter(val === 'all' ? null : val)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All Producers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Producers</SelectItem>
                {producers?.filter(p => p.active).map(producer => (
                  <SelectItem key={producer.id} value={producer.id}>
                    {producer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Unique Gaps</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalGaps}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gap Occurrences</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalOccurrences}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Common Gap</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium truncate" title={summaryStats.mostCommon.gap_name}>
                {summaryStats.mostCommon.gap_name}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summaryStats.mostCommon.frequency} occurrences
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Gaps per Review</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.avgGapsPerReview}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Gap Frequency Distribution</CardTitle>
          <CardDescription>Visualization of common weak points by frequency</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={filteredAndSortedData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="gap_name" type="category" width={140} />
              <Tooltip />
              <Bar dataKey="frequency" radius={[0, 4, 4, 0]}>
                {filteredAndSortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getSeverityColor(entry.frequency)} />
                ))}
                <LabelList dataKey="frequency" position="right" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Breakdown</CardTitle>
          <CardDescription>Complete list of weak points with producer details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search gaps..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('gap_name')}>
                    Gap Name {sortColumn === 'gap_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('frequency')}>
                    Frequency {sortColumn === 'frequency' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('affected_producers')}>
                    Affected Producers {sortColumn === 'affected_producers' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('recent_count')}>
                    Recent (Last 30 Days) {sortColumn === 'recent_count' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Who Has This Issue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.map((point, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{point.gap_name}</TableCell>
                    <TableCell>
                      <Badge 
                        style={{ backgroundColor: getSeverityColor(point.frequency) }}
                        className="text-white"
                      >
                        {point.frequency}
                      </Badge>
                    </TableCell>
                    <TableCell>{point.affected_producers}</TableCell>
                    <TableCell>{point.recent_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{point.producer_names}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Insights Section */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>Auto-generated coaching insights</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    {idx + 1}
                  </Badge>
                  <span className="text-sm">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default CommonWeakPointsReport

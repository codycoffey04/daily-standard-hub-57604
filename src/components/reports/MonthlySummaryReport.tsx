import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { useMonthlySummary, useTopSourcesByMonth } from '@/hooks/useMonthlySummary'
import { useQueryClient } from '@tanstack/react-query'
import { TrendingUp, Users, Phone, Clock, Target, Award, RefreshCw } from 'lucide-react'
import dayjs from 'dayjs'

interface MonthlySummaryReportProps {
  selectedYear: number
  selectedMonth: number | null
}

const MonthlySummaryReport: React.FC<MonthlySummaryReportProps> = ({ selectedYear, selectedMonth }) => {
  const queryClient = useQueryClient()
  
  console.log('📊 === MonthlySummaryReport RENDERING ===')
  console.log('  Props - selectedYear:', selectedYear, 'selectedMonth:', selectedMonth)

  const { data: summaryData, isLoading, error } = useMonthlySummary(selectedYear, selectedMonth)
  
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['monthly-summary-v4'] })
    queryClient.invalidateQueries({ queryKey: ['top-sources-by-month-v2'] })
  }
  
  console.log('  Hook returned - isLoading:', isLoading, 'hasData:', !!summaryData, 'hasError:', !!error)

  React.useEffect(() => {
    if (summaryData) {
      console.log('🎯 Component received summaryData:', summaryData)
      console.log('  QHH:', summaryData.total_qhh)
      console.log('  Quotes:', summaryData.total_quotes)
    }
  }, [summaryData])

  // Calculate monthYm directly from props (same as useMonthlySummary hook)
  const monthYm = useMemo(() => {
    return selectedMonth 
      ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
      : `${selectedYear}-01`
  }, [selectedYear, selectedMonth])

  console.log('🔍 MonthlySummaryReport - Calculated monthYm:', monthYm)

  // Keep month_date for display purposes
  const mostRecentMonth = summaryData?.month_date || null

  const { data: topQuoteSources, isLoading: isLoadingQuotes, error: quotesError } = useTopSourcesByMonth(monthYm, 'quotes')
  const { data: topQHHSources, isLoading: isLoadingQHH, error: qhhError } = useTopSourcesByMonth(monthYm, 'qhh')

  // Debug logging for Top Sources
  React.useEffect(() => {
    console.log('📊 Top Sources Data Status:')
    console.log('  monthYm:', monthYm)
    console.log('  topQuoteSources:', topQuoteSources)
    console.log('  topQHHSources:', topQHHSources)
    console.log('  isLoadingQuotes:', isLoadingQuotes)
    console.log('  isLoadingQHH:', isLoadingQHH)
    console.log('  quotesError:', quotesError)
    console.log('  qhhError:', qhhError)
  }, [monthYm, topQuoteSources, topQHHSources, isLoadingQuotes, isLoadingQHH, quotesError, qhhError])

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!summaryData) {
      return {
        totalQHH: 0,
        totalQuotes: 0,
        avgFramework: 0,
        totalDials: 0,
        totalTalkTimeHrs: 0,
        avgQuotesPerHH: 0
      }
    }

    const totalQHH = summaryData.total_qhh || 0
    const totalQuotes = summaryData.total_quotes || 0
    const avgFramework = summaryData.framework_compliance_pct || 0
    const totalDials = summaryData.total_dials || 0
    const totalTalkMins = summaryData.total_talk_time || 0
    const totalTalkTimeHrs = Math.round(totalTalkMins / 60)
    const avgQuotesPerHH = totalQHH > 0 ? (totalQuotes / totalQHH) : 0

    return {
      totalQHH,
      totalQuotes,
      avgFramework,
      totalDials,
      totalTalkTimeHrs,
      avgQuotesPerHH
    }
  }, [summaryData])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading monthly summary: {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    )
  }

  if (!summaryData) {
    return <EmptyState message="No activity data found for this period." />
  }

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleRefresh}
          variant="outline" 
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Total QHH
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryMetrics.totalQHH.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Quotes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryMetrics.totalQuotes.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Avg Framework Compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryMetrics.avgFramework.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Total Outbound Dials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryMetrics.totalDials.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Total Talk Time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryMetrics.totalTalkTimeHrs.toLocaleString()} hrs</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Avg Quotes per Household
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryMetrics.avgQuotesPerHH.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Sources Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Sources for Quotes</CardTitle>
            <CardDescription>
              {mostRecentMonth ? dayjs(mostRecentMonth).format('MMMM YYYY') : 'Most Recent Month'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topQuoteSources && topQuoteSources.length > 0 ? (
              <div className="space-y-3">
                {topQuoteSources.map((source, index) => (
                  <div key={source.source_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium">{source.source_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{source?.metric_value ?? 0}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {(source?.percentage ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Sources for QHH</CardTitle>
            <CardDescription>
              {mostRecentMonth ? dayjs(mostRecentMonth).format('MMMM YYYY') : 'Most Recent Month'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topQHHSources && topQHHSources.length > 0 ? (
              <div className="space-y-3">
                {topQHHSources.map((source, index) => (
                  <div key={source.source_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium">{source.source_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{source?.metric_value ?? 0}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {(source?.percentage ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MonthlySummaryReport

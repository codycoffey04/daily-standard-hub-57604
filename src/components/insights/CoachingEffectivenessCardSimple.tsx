import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useCoachingEffectivenessSimple } from '@/hooks/useAnalyticsData'

interface CoachingEffectivenessCardProps {
  dateRange: { from: Date; to: Date }
  selectedProducer?: string
}

export const CoachingEffectivenessCardSimple: React.FC<CoachingEffectivenessCardProps> = ({ 
  dateRange, 
  selectedProducer 
}) => {
  const { data: effectiveness, isLoading } = useCoachingEffectivenessSimple(dateRange, selectedProducer)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Coaching Effectiveness</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-muted rounded mb-4"></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!effectiveness) return null

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-success" />
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-destructive" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'positive':
        return 'text-success'
      case 'negative':
        return 'text-destructive'
      default:
        return 'text-muted-foreground'
    }
  }

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'positive':
        return 'Improving'
      case 'negative':
        return 'Declining'
      default:
        return 'Stable'
    }
  }

  const getResolutionRating = (rate: number) => {
    if (rate >= 80) return { text: 'Excellent', color: 'text-success' }
    if (rate >= 60) return { text: 'Good', color: 'text-primary' }
    if (rate >= 40) return { text: 'Fair', color: 'text-warning' }
    return { text: 'Needs Improvement', color: 'text-destructive' }
  }

  const resolutionRating = getResolutionRating(effectiveness.resolution_rate)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Coaching Effectiveness</span>
          </div>
          <div className="flex items-center space-x-2">
            {getTrendIcon(effectiveness.improvement_trend)}
            <span className={`text-sm ${getTrendColor(effectiveness.improvement_trend)}`}>
              {getTrendText(effectiveness.improvement_trend)}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Resolution Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Issue Resolution Rate</span>
              <Badge variant="outline" className={resolutionRating.color}>
                {resolutionRating.text}
              </Badge>
            </div>
            <Progress value={effectiveness.resolution_rate} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground dark:text-slate-200">
              <span>{effectiveness.resolution_rate.toFixed(1)}% of issues resolved</span>
              <span>{effectiveness.resolved_issues} of {effectiveness.total_issues} issues</span>
            </div>
          </div>

          {/* Issue Breakdown */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{effectiveness.total_issues}</div>
              <div className="text-xs text-muted-foreground">Total Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{effectiveness.resolved_issues}</div>
              <div className="text-xs text-muted-foreground">Resolved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{effectiveness.recurring_issues}</div>
              <div className="text-xs text-muted-foreground">Recurring</div>
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-2 pt-4 border-t border-border">
            <h4 className="text-sm font-medium">Key Insights</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              {effectiveness.resolution_rate >= 80 && (
                <div className="flex items-center space-x-1">
                  <span className="text-success">•</span>
                  <span>Excellent coaching effectiveness - issues are being resolved quickly</span>
                </div>
              )}
              {effectiveness.resolution_rate < 40 && (
                <div className="flex items-center space-x-1">
                  <span className="text-destructive">•</span>
                  <span>Consider reviewing coaching strategies - many issues remain unresolved</span>
                </div>
              )}
              {effectiveness.recurring_issues > effectiveness.resolved_issues && (
                <div className="flex items-center space-x-1">
                  <span className="text-warning">•</span>
                  <span>High recurrence rate - focus on root cause analysis</span>
                </div>
              )}
              {effectiveness.improvement_trend === 'positive' && (
                <div className="flex items-center space-x-1">
                  <span className="text-success">•</span>
                  <span>Trend is positive - coaching efforts are showing results</span>
                </div>
              )}
              {effectiveness.improvement_trend === 'negative' && (
                <div className="flex items-center space-x-1">
                  <span className="text-destructive">•</span>
                  <span>Issues increasing over time - may need intervention strategy</span>
                </div>
              )}
              {effectiveness.total_issues === 0 && (
                <div className="flex items-center space-x-1">
                  <span className="text-success">•</span>
                  <span>No issues identified in this period</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, TrendingDown, Target, AlertCircle, Flame } from 'lucide-react'
import {
  useAllActivePatterns,
  PATTERN_CONFIG,
  SEVERITY_CONFIG,
  getPatternCounts,
  type DetectedPatternWithProducer,
} from '@/hooks/useDetectedPatterns'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'

interface ActivePatternsCardProps {
  selectedProducer?: string
}

const PatternIcon: React.FC<{ patternType: DetectedPatternWithProducer['pattern_type'] }> = ({
  patternType,
}) => {
  switch (patternType) {
    case 'low_conversion':
      return <TrendingDown className="h-4 w-4" />
    case 'source_failing':
      return <Target className="h-4 w-4" />
    case 'outside_streak':
      return <AlertCircle className="h-4 w-4" />
    case 'zero_item_streak':
      return <Flame className="h-4 w-4" />
    default:
      return <AlertTriangle className="h-4 w-4" />
  }
}

const PatternRow: React.FC<{ pattern: DetectedPatternWithProducer }> = ({ pattern }) => {
  const patternConfig = PATTERN_CONFIG[pattern.pattern_type]
  const severityConfig = SEVERITY_CONFIG[pattern.severity]

  return (
    <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className={`p-2 rounded-lg ${severityConfig.badgeClassName}`}>
        <PatternIcon patternType={pattern.pattern_type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-medium">{pattern.producer_name}</span>
          <Badge variant="outline" className={severityConfig.badgeClassName}>
            {severityConfig.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(pattern.detected_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground">{patternConfig.label}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{pattern.context.message}</p>
      </div>
    </div>
  )
}

export const ActivePatternsCard: React.FC<ActivePatternsCardProps> = ({ selectedProducer }) => {
  const { data: allPatterns, isLoading, error } = useAllActivePatterns()

  // Filter by selected producer if provided
  const patterns = React.useMemo(() => {
    if (!allPatterns) return []
    if (!selectedProducer || selectedProducer === 'all') return allPatterns
    return allPatterns.filter((p) => p.producer_id === selectedProducer)
  }, [allPatterns, selectedProducer])

  const counts = patterns ? getPatternCounts(patterns) : { critical: 0, warning: 0, info: 0, total: 0 }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Active Patterns</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Active Patterns</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load patterns</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Active Patterns</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {counts.critical > 0 && (
              <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                {counts.critical} Critical
              </Badge>
            )}
            {counts.warning > 0 && (
              <Badge className="bg-warning/10 text-warning border-warning/20">
                {counts.warning} Warning
              </Badge>
            )}
            {counts.total === 0 && (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                All Clear
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {patterns.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-3">
              <AlertTriangle className="h-6 w-6 text-success" />
            </div>
            <p className="font-medium text-foreground">No Active Patterns</p>
            <p className="text-sm text-muted-foreground mt-1">
              All producers are performing within expected parameters
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {patterns.map((pattern) => (
              <PatternRow key={pattern.id} pattern={pattern} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

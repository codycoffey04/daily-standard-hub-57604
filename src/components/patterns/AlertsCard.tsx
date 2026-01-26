import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import {
  useProducerPatterns,
  PATTERN_CONFIG,
  SEVERITY_CONFIG,
  type DetectedPattern,
} from '@/hooks/useDetectedPatterns'

interface AlertsCardProps {
  producerId: string | null | undefined
}

const PatternItem: React.FC<{ pattern: DetectedPattern }> = ({ pattern }) => {
  const patternConfig = PATTERN_CONFIG[pattern.pattern_type]
  const severityConfig = SEVERITY_CONFIG[pattern.severity]

  return (
    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
      <span className="text-lg flex-shrink-0">{patternConfig.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{patternConfig.label}</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded border ${severityConfig.badgeClassName}`}
          >
            {severityConfig.label}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 break-words">
          {pattern.context.message}
        </p>
      </div>
    </div>
  )
}

export const AlertsCard: React.FC<AlertsCardProps> = ({ producerId }) => {
  const { data: patterns, isLoading } = useProducerPatterns(producerId)

  // Don't render anything if loading, no producer, or no patterns
  if (isLoading || !producerId || !patterns || patterns.length === 0) {
    return null
  }

  const criticalCount = patterns.filter((p) => p.severity === 'critical').length
  const warningCount = patterns.filter((p) => p.severity === 'warning').length

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="font-medium text-sm">
            {patterns.length} Pattern{patterns.length !== 1 ? 's' : ''} Detected
          </span>
          {criticalCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
              {criticalCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
              {warningCount} Warning
            </span>
          )}
        </div>
        <div className="space-y-2">
          {patterns.map((pattern) => (
            <PatternItem key={pattern.id} pattern={pattern} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

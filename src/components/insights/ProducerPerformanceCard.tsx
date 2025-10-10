import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, AlertCircle, CheckCircle2, Users } from 'lucide-react'
import { useProducerPerformanceAlerts } from '@/hooks/useAnalyticsData'

interface ProducerPerformanceCardProps {
  dateRange: { from: Date; to: Date }
  selectedProducer?: string
}

export const ProducerPerformanceCard: React.FC<ProducerPerformanceCardProps> = ({ 
  dateRange, 
  selectedProducer 
}) => {
  const { data: alerts = [], isLoading } = useProducerPerformanceAlerts(dateRange, selectedProducer)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Producer Performance Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return <AlertTriangle className="h-4 w-4" />
      case 'Warning':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <CheckCircle2 className="h-4 w-4" />
    }
  }

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'destructive' as const
      case 'Warning':
        return 'secondary' as const
      default:
        return 'outline' as const
    }
  }

  const criticalCount = alerts.filter(a => a.severity === 'Critical').length
  const warningCount = alerts.filter(a => a.severity === 'Warning').length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Producer Performance Alerts</span>
          </div>
          <div className="flex items-center space-x-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {warningCount} Warning
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
            <p className="text-sm font-medium">All producers performing well!</p>
            <p className="text-xs text-muted-foreground">No performance alerts detected</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.producer_id} className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{alert.producer_name}</span>
                    <Badge variant={getSeverityVariant(alert.severity)} className="text-xs">
                      <div className="flex items-center space-x-1">
                        {getSeverityIcon(alert.severity)}
                        <span>{alert.severity}</span>
                      </div>
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground dark:text-slate-200">
                    {alert.conversion_rate.toFixed(1)}% conversion
                  </span>
                </div>
                <div className="space-y-1">
                  {alert.issues.map((issue, index) => (
                    <div key={index} className="text-xs text-muted-foreground flex items-start space-x-1">
                      <span className="text-destructive mt-0.5">•</span>
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
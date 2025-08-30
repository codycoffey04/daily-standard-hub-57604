import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface YesterdayStatusBannerProps {
  status: {
    framework_status: 'Top' | 'Bottom' | 'Outside'
    met_dials: boolean
    met_talk: boolean
    met_qhh: boolean  
    met_items: boolean
    met_count: number
    entry_date: string
  }
  className?: string
}

export const YesterdayStatusBanner: React.FC<YesterdayStatusBannerProps> = ({ 
  status, 
  className 
}) => {
  const getStatusConfig = (frameworkStatus: string) => {
    switch (frameworkStatus) {
      case 'Top':
        return {
          icon: CheckCircle,
          color: 'text-success',
          bgColor: 'bg-success/10',
          borderColor: 'border-success/20',
          message: 'Excellent work! You met the daily standards.',
          badgeVariant: 'default' as const
        }
      case 'Bottom':
        return {
          icon: AlertTriangle,
          color: 'text-warning',
          bgColor: 'bg-warning/10',
          borderColor: 'border-warning/20',
          message: 'Good effort, but consider focusing on impact metrics.',
          badgeVariant: 'secondary' as const
        }
      case 'Outside':
        return {
          icon: XCircle,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          borderColor: 'border-destructive/20',
          message: 'Let\'s aim higher today. Focus on the daily minimums.',
          badgeVariant: 'destructive' as const
        }
      default:
        return {
          icon: TrendingUp,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          borderColor: 'border-muted/20',
          message: 'No data available for yesterday.',
          badgeVariant: 'outline' as const
        }
    }
  }

  const config = getStatusConfig(status.framework_status)
  const Icon = config.icon

  const getMissingMetrics = () => {
    const missing = []
    if (!status.met_dials) missing.push('Outbound Dials (100+)')
    if (!status.met_talk) missing.push('Talk Minutes (180+)')
    if (!status.met_qhh) missing.push('QHH (4+)')
    if (!status.met_items) missing.push('Items Sold (2+)')
    return missing
  }

  const missingMetrics = getMissingMetrics()

  return (
    <Card className={cn(
      'border-l-4',
      config.bgColor,
      config.borderColor,
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          <Icon className={cn('h-6 w-6 mt-0.5', config.color)} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-sm font-semibold text-foreground">
                Yesterday's Performance
              </h3>
              <Badge variant={config.badgeVariant}>
                {status.framework_status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(status.entry_date).toLocaleDateString()}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {config.message}
            </p>

            {/* Metrics Status */}
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant={status.met_dials ? 'default' : 'outline'} className="text-xs">
                Dials {status.met_dials ? '✓' : '✗'}
              </Badge>
              <Badge variant={status.met_talk ? 'default' : 'outline'} className="text-xs">
                Talk {status.met_talk ? '✓' : '✗'}
              </Badge>
              <Badge variant={status.met_qhh ? 'default' : 'outline'} className="text-xs">
                QHH {status.met_qhh ? '✓' : '✗'}
              </Badge>
              <Badge variant={status.met_items ? 'default' : 'outline'} className="text-xs">
                Items {status.met_items ? '✓' : '✗'}
              </Badge>
            </div>

            {/* What's Missing */}
            {missingMetrics.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Focus areas: </span>
                {missingMetrics.join(', ')}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
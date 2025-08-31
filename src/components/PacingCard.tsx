import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PacingCardProps {
  metrics: {
    producer_name: string
    qhh: number
    quotes: number
    items: number
    sales: number
    conversion: number
    vc_pace: number
    vc_badge: 'Green' | 'Amber' | 'Red'
    yesterday_status: 'Top' | 'Bottom' | 'Outside' | null
    office_total_items: number
    office_vc_pace: number
    office_vc_badge: 'Green' | 'Amber' | 'Red'
  }
  className?: string
}

export const PacingCard: React.FC<PacingCardProps> = ({ metrics, className }) => {
  const getVCBadgeClassName = (badge: string) => {
    switch (badge) {
      case 'Green':
        return 'vc-green'
      case 'Amber':
        return 'vc-amber'
      case 'Red':
        return 'vc-red'
      default:
        return ''
    }
  }

  const getVCBadgeColor = (badge: string) => {
    switch (badge) {
      case 'Green':
        return 'text-success'
      case 'Amber':
        return 'text-warning'
      case 'Red':
        return 'text-destructive'
      default:
        return 'text-muted-foreground'
    }
  }

  const officeTarget = 69 // Office VC goal
  const remainingItems = Math.max(0, officeTarget - metrics.office_total_items)
  const userContributionPct = metrics.office_total_items > 0 
    ? Math.round((metrics.items / metrics.office_total_items) * 100) 
    : 0

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5" />
          <span>MTD Performance</span>
        </CardTitle>
        <CardDescription>Month-to-date metrics and VC pacing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{metrics.qhh}</div>
            <div className="text-xs text-muted-foreground">QHH</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{metrics.quotes}</div>
            <div className="text-xs text-muted-foreground">Quotes</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{metrics.conversion}%</div>
            <div className="text-xs text-muted-foreground">Conversion</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{metrics.items}</div>
            <div className="text-xs text-muted-foreground">Items</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">{metrics.sales}</div>
            <div className="text-xs text-muted-foreground">Sales</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Badge className={getVCBadgeClassName(metrics.vc_badge)}>
              {metrics.vc_badge}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">VC Badge</div>
          </div>
        </div>

        {/* Office VC Progress */}
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Office VC Target</span>
              <span className="text-sm">{officeTarget} items</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Office Progress</span>
              <span className={cn('text-sm font-medium', getVCBadgeColor(metrics.office_vc_badge))}>
                {metrics.office_total_items} of {officeTarget}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={cn(
                  'rounded-full h-2 transition-all',
                  metrics.office_vc_badge === 'Green' ? 'bg-success' :
                  metrics.office_vc_badge === 'Amber' ? 'bg-warning' : 'bg-destructive'
                )}
                style={{ width: `${Math.min(100, (metrics.office_total_items / officeTarget) * 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Your Contribution</span>
              <span>{metrics.items} items ({userContributionPct}% of goal)</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Office Needs</span>
              <span>{remainingItems} more</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Office Pace</span>
              <span>{metrics.office_vc_pace} items/month</span>
            </div>
          </div>
        </div>

        {/* Yesterday Status */}
        {metrics.yesterday_status && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Yesterday</span>
              <Badge 
                variant={
                  metrics.yesterday_status === 'Top' ? 'default' :
                  metrics.yesterday_status === 'Bottom' ? 'secondary' : 'destructive'
                }
                className="text-xs"
              >
                {metrics.yesterday_status}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from 'lucide-react'
import { useConversionFunnelData } from '@/hooks/useAnalyticsData'

interface ConversionFunnelCardProps {
  dateRange: { from: Date; to: Date }
}

export const ConversionFunnelCard: React.FC<ConversionFunnelCardProps> = ({ dateRange }) => {
  const { data: funnelData, isLoading } = useConversionFunnelData(dateRange)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Conversion Funnel Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-muted rounded mb-4"></div>
              <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
              <div className="h-2 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!funnelData) return null

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-success" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-destructive" />
    return null
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-success'
    if (change < 0) return 'text-destructive'
    return 'text-muted-foreground'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Conversion Funnel Analysis</span>
          {(funnelData.alerts.qhhToItemsAlert || funnelData.alerts.itemsToSalesAlert) && (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* QHH to Items Conversion */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">QHH → Items</span>
              <div className="flex items-center space-x-2">
                {getTrendIcon(funnelData.trends.qhhToItemsChange)}
                <span className={`text-sm ${getTrendColor(funnelData.trends.qhhToItemsChange)}`}>
                  {funnelData.trends.qhhToItemsChange > 0 ? '+' : ''}{funnelData.trends.qhhToItemsChange.toFixed(1)}%
                </span>
              </div>
            </div>
            <Progress value={Math.min(funnelData.current.qhhToItems, 100)} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{funnelData.current.qhhToItems.toFixed(1)}% conversion rate</span>
              <span>{funnelData.current.totalQhh} QHH → {funnelData.current.totalItems} Items</span>
            </div>
            {funnelData.alerts.qhhToItemsAlert && (
              <Badge variant="destructive" className="text-xs">
                Alert: 20%+ drop from previous period
              </Badge>
            )}
          </div>

          {/* Items to Sales Conversion */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Items → Sales</span>
              <div className="flex items-center space-x-2">
                {getTrendIcon(funnelData.trends.itemsToSalesChange)}
                <span className={`text-sm ${getTrendColor(funnelData.trends.itemsToSalesChange)}`}>
                  {funnelData.trends.itemsToSalesChange > 0 ? '+' : ''}{funnelData.trends.itemsToSalesChange.toFixed(1)}%
                </span>
              </div>
            </div>
            <Progress value={Math.min(funnelData.current.itemsToSales, 100)} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{funnelData.current.itemsToSales.toFixed(1)}% conversion rate</span>
              <span>{funnelData.current.totalItems} Items → {funnelData.current.totalSales} Sales</span>
            </div>
            {funnelData.alerts.itemsToSalesAlert && (
              <Badge variant="destructive" className="text-xs">
                Alert: 20%+ drop from previous period
              </Badge>
            )}
          </div>

          {/* Summary Stats */}
          <div className="pt-4 border-t border-border">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{funnelData.current.totalQhh}</div>
                <div className="text-xs text-muted-foreground">Total QHH</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{funnelData.current.totalItems}</div>
                <div className="text-xs text-muted-foreground">Total Items</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{funnelData.current.totalSales}</div>
                <div className="text-xs text-muted-foreground">Total Sales</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
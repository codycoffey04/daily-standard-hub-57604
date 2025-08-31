import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { BarChart3, AlertTriangle } from 'lucide-react'
import { useSalesProcessGaps } from '@/hooks/useAnalyticsData'

interface SalesProcessGapsCardProps {
  dateRange: { from: Date; to: Date }
  selectedProducer?: string
}

export const SalesProcessGapsCard: React.FC<SalesProcessGapsCardProps> = ({ 
  dateRange, 
  selectedProducer 
}) => {
  const { data: gapsData = [], isLoading } = useSalesProcessGaps(dateRange, selectedProducer)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Sales Process Gaps</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse">
            <div className="h-full bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const highFrequencyIssues = gapsData.filter(gap => gap.isHighFrequency)
  const chartData = gapsData.slice(0, 8).map(gap => ({
    step: gap.step.length > 15 ? gap.step.substring(0, 15) + '...' : gap.step,
    fullStep: gap.step,
    count: gap.count,
    percentage: gap.percentage,
    isHigh: gap.isHighFrequency
  }))

  const chartConfig = {
    count: {
      label: "Occurrences",
      color: "hsl(var(--primary))"
    },
    highFrequency: {
      label: "High Frequency",
      color: "hsl(var(--destructive))"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Sales Process Gaps</span>
          </div>
          {highFrequencyIssues.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {highFrequencyIssues.length} High Frequency
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {gapsData.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm font-medium">No weak steps identified</p>
            <p className="text-xs text-muted-foreground">Great job on process adherence!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* High Frequency Alerts */}
            {highFrequencyIssues.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Critical Issues (&gt;30%)</span>
                </div>
                <div className="space-y-1">
                  {highFrequencyIssues.map((issue, index) => (
                    <div key={index} className="text-xs text-destructive">
                      • {issue.step} ({issue.percentage.toFixed(1)}% of reviews)
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chart */}
            <div className="h-64">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <XAxis 
                      dataKey="step" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={10}
                    />
                    <YAxis fontSize={10} />
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value, name, props) => [
                          `${value} occurrences (${props.payload.percentage.toFixed(1)}%)`,
                          props.payload.fullStep
                        ]}
                      />} 
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{gapsData.length}</div>
                <div className="text-xs text-muted-foreground">Total Issues</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">{highFrequencyIssues.length}</div>
                <div className="text-xs text-muted-foreground">High Frequency</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {gapsData.length > 0 ? gapsData[0].count : 0}
                </div>
                <div className="text-xs text-muted-foreground">Most Common</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
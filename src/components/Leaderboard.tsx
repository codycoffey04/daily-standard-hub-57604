import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface LeaderboardProps {
  metrics: any[]
  loading: boolean
  onRefresh: () => void
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ metrics, loading, onRefresh }) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Leaderboard</CardTitle>
            <CardDescription>Month-to-date performance metrics</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Producer</th>
                <th className="text-right p-2">QHH</th>
                <th className="text-right p-2">Quotes</th>
                <th className="text-right p-2">Items</th>
                <th className="text-right p-2">Sales</th>
                <th className="text-right p-2">Conv%</th>
                <th className="text-center p-2">VC Badge</th>
                <th className="text-center p-2">Yesterday</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric, index) => (
                <tr key={metric.producer_id} className="border-b">
                  <td className="p-2 font-medium">{metric.producer_name}</td>
                  <td className="p-2 text-right">{metric.qhh}</td>
                  <td className="p-2 text-right">{metric.quotes}</td>
                  <td className="p-2 text-right">{metric.items}</td>
                  <td className="p-2 text-right">{metric.sales}</td>
                  <td className="p-2 text-right">{metric.conversion}%</td>
                  <td className="p-2 text-center">
                    <Badge variant={metric.vc_badge === 'Green' ? 'default' : metric.vc_badge === 'Amber' ? 'secondary' : 'destructive'}>
                      {metric.vc_badge}
                    </Badge>
                  </td>
                  <td className="p-2 text-center">
                    {metric.yesterday_status && (
                      <Badge variant={metric.yesterday_status === 'Top' ? 'default' : metric.yesterday_status === 'Bottom' ? 'secondary' : 'destructive'}>
                        {metric.yesterday_status}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
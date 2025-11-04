import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { useCoachingEffectivenessDashboard } from '@/hooks/useCoachingEffectivenessDashboard'
import { format } from 'date-fns'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const CoachingEffectivenessDashboard = () => {
  const [timeframe, setTimeframe] = useState<number>(30)
  const { data, isLoading, error } = useCoachingEffectivenessDashboard(timeframe)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load coaching effectiveness data. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  if (!data?.overall_metrics) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No coaching data available for the selected timeframe.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { overall_metrics, producer_progress, gap_analysis, weekly_trends } = data

  // Prepare radar chart data
  const radarData = [
    { metric: 'Resolution Rate', value: overall_metrics.overall_resolution_rate },
    { metric: 'Effectiveness', value: overall_metrics.effectiveness_score },
    { metric: 'Consistency', value: overall_metrics.avg_days_between_reviews > 0 
        ? Math.min(100, (7 / overall_metrics.avg_days_between_reviews) * 100) 
        : 0 
    },
    { metric: 'Coverage', value: overall_metrics.total_producers > 0 
        ? Math.min(100, (overall_metrics.total_reviews / overall_metrics.total_producers) * 10) 
        : 0 
    }
  ]

  // Prepare trend chart data
  const trendChartData = weekly_trends.map(trend => ({
    week: format(new Date(trend.week_start), 'MMM dd'),
    resolution: trend.resolution_rate,
    effectiveness: trend.avg_effectiveness_score,
    reviews: trend.reviews_count
  }))

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">High</Badge>
      case 'medium':
        return <Badge variant="default">Medium</Badge>
      default:
        return <Badge variant="secondary">Low</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {[30, 60, 90].map((days) => (
            <button
              key={days}
              onClick={() => setTimeframe(days)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeframe === days
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overall_metrics.effectiveness_score.toFixed(1)}%
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getTrendIcon(overall_metrics.trend_direction)}
              <span className="capitalize">{overall_metrics.trend_direction}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overall_metrics.overall_resolution_rate.toFixed(1)}%
            </div>
            <Progress value={overall_metrics.overall_resolution_rate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Days Between</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overall_metrics.avg_days_between_reviews.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">days between reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Producers Tracked</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overall_metrics.total_producers}</div>
            <p className="text-xs text-muted-foreground">
              {overall_metrics.total_reviews} total reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="producers">Producers</TabsTrigger>
          <TabsTrigger value="gaps">Gaps</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Effectiveness Radar</CardTitle>
              <CardDescription>
                Overall coaching effectiveness across key dimensions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Effectiveness"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Performing Producers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {producer_progress
                    .sort((a, b) => b.resolution_rate - a.resolution_rate)
                    .slice(0, 3)
                    .map((producer) => (
                      <div key={producer.producer_id} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{producer.producer_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {producer.resolution_rate.toFixed(0)}%
                          </span>
                          {getTrendIcon(producer.trend)}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attention Needed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {producer_progress
                    .filter((p) => p.resolution_rate < 50 || p.trend === 'declining')
                    .slice(0, 3)
                    .map((producer) => (
                      <div key={producer.producer_id} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{producer.producer_name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            {producer.unresolved_issues} unresolved
                          </Badge>
                        </div>
                      </div>
                    ))}
                  {producer_progress.filter((p) => p.resolution_rate < 50 || p.trend === 'declining').length === 0 && (
                    <p className="text-sm text-muted-foreground">All producers performing well</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Producers Tab */}
        <TabsContent value="producers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {producer_progress.map((producer) => (
              <Card key={producer.producer_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{producer.producer_name}</CardTitle>
                    {getTrendIcon(producer.trend)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Resolution Rate</span>
                      <span className="font-medium">{producer.resolution_rate.toFixed(0)}%</span>
                    </div>
                    <Progress value={producer.resolution_rate} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Reviews</p>
                      <p className="text-lg font-semibold">{producer.total_reviews}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Days Between</p>
                      <p className="text-lg font-semibold">
                        {producer.avg_days_between_reviews.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-green-600">
                      {producer.resolved_issues} resolved
                    </Badge>
                    <Badge variant="outline" className="text-red-600">
                      {producer.unresolved_issues} unresolved
                    </Badge>
                  </div>

                  {producer.last_review_date && (
                    <p className="text-xs text-muted-foreground">
                      Last review: {format(new Date(producer.last_review_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Gaps Tab */}
        <TabsContent value="gaps">
          <Card>
            <CardHeader>
              <CardTitle>Gap Analysis</CardTitle>
              <CardDescription>
                Most common weak points and their resolution effectiveness
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gap Category</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Resolution Rate</TableHead>
                    <TableHead>Avg Resolution Days</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gap_analysis.map((gap, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{gap.gap_category}</TableCell>
                      <TableCell>{gap.frequency}</TableCell>
                      <TableCell>{gap.resolution_rate.toFixed(1)}%</TableCell>
                      <TableCell>{gap.avg_resolution_days.toFixed(1)} days</TableCell>
                      <TableCell>{getSeverityBadge(gap.severity)}</TableCell>
                    </TableRow>
                  ))}
                  {gap_analysis.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No gap data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Trends</CardTitle>
              <CardDescription>
                Coaching effectiveness and resolution rates over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="resolution"
                    stackId="1"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                    name="Resolution Rate %"
                  />
                  <Area
                    type="monotone"
                    dataKey="effectiveness"
                    stackId="2"
                    stroke="hsl(var(--secondary))"
                    fill="hsl(var(--secondary))"
                    fillOpacity={0.6}
                    name="Effectiveness Score %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

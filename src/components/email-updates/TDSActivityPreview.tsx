import React from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Activity, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface TDSActivityMetrics {
  qhh: number
  quotes: number
  dials: number
  talk_minutes: number
}

interface TDSActivityPreviewProps {
  tdsActivity: Record<string, TDSActivityMetrics> | null | undefined
  isLoading: boolean
  periodStartStr: string
  periodEndStr: string
  onRefresh?: () => void
}

function formatTalkTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

export const TDSActivityPreview: React.FC<TDSActivityPreviewProps> = ({
  tdsActivity,
  isLoading,
  periodStartStr,
  periodEndStr,
  onRefresh
}) => {
  // Calculate team totals
  const teamTotals = React.useMemo(() => {
    if (!tdsActivity) return { qhh: 0, quotes: 0, dials: 0, talk_minutes: 0 }

    return Object.values(tdsActivity).reduce(
      (acc, activity) => ({
        qhh: acc.qhh + activity.qhh,
        quotes: acc.quotes + activity.quotes,
        dials: acc.dials + activity.dials,
        talk_minutes: acc.talk_minutes + activity.talk_minutes
      }),
      { qhh: 0, quotes: 0, dials: 0, talk_minutes: 0 }
    )
  }, [tdsActivity])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            MTD TDS Activity (Auto-Pulled)
          </h3>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  const hasData = tdsActivity && Object.keys(tdsActivity).length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            MTD TDS Activity (Auto-Pulled)
          </h3>
          <Badge variant="outline" className="text-xs">
            MTD: {periodStartStr} to {periodEndStr}
          </Badge>
        </div>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!hasData ? (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No TDS activity data for this period</p>
          <p className="text-xs mt-1">Activity is pulled from daily entries</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producer</TableHead>
                <TableHead className="text-right">QHH</TableHead>
                <TableHead className="text-right">Quotes</TableHead>
                <TableHead className="text-right">Dials</TableHead>
                <TableHead className="text-right">
                  <span className="flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" />
                    Talk Time
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(tdsActivity)
                .sort((a, b) => b[1].qhh - a[1].qhh)
                .map(([producer, activity]) => (
                  <TableRow key={producer}>
                    <TableCell className="font-medium capitalize">{producer}</TableCell>
                    <TableCell className="text-right">{activity.qhh}</TableCell>
                    <TableCell className="text-right">{activity.quotes}</TableCell>
                    <TableCell className="text-right">{activity.dials}</TableCell>
                    <TableCell className="text-right">{formatTalkTime(activity.talk_minutes)}</TableCell>
                  </TableRow>
                ))}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell>Team Total</TableCell>
                <TableCell className="text-right">{teamTotals.qhh}</TableCell>
                <TableCell className="text-right">{teamTotals.quotes}</TableCell>
                <TableCell className="text-right">{teamTotals.dials}</TableCell>
                <TableCell className="text-right">{formatTalkTime(teamTotals.talk_minutes)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

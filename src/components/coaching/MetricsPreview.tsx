import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { formatPremium, formatCloseRate, type ParsedMetrics } from '@/utils/metricsParser'
import type { Database } from '@/integrations/supabase/types'

type CoachingMetrics = Database['public']['Tables']['coaching_metrics']['Row']

interface MetricsPreviewProps {
  metrics: CoachingMetrics | null
  parsedMetrics: ParsedMetrics | null
  isLoading: boolean
}

export const MetricsPreview: React.FC<MetricsPreviewProps> = ({
  metrics,
  parsedMetrics,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  // Use saved metrics if available, otherwise use parsed preview
  const displayData = metrics
    ? (metrics.producer_metrics as unknown as Record<string, {
        qhh: number
        quotes: number
        sales: number
        items: number
        premium: number
        close_rate: number
      }>)
    : parsedMetrics?.producers

  const teamData = metrics
    ? {
        qhh: metrics.team_qhh ?? 0,
        quotes: metrics.team_quotes ?? 0,
        sales: metrics.team_sales ?? 0,
        items: metrics.team_items ?? 0,
        premium: metrics.team_premium ?? 0,
        close_rate: metrics.team_close_rate ?? 0
      }
    : parsedMetrics?.team

  if (!displayData || Object.keys(displayData).length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        <p>Paste AgencyZoom data to preview metrics</p>
      </div>
    )
  }

  const producers = Object.entries(displayData)

  return (
    <div className="space-y-4">
      {metrics && (
        <Badge variant="secondary" className="mb-2">
          Saved {new Date(metrics.created_at).toLocaleDateString()}
        </Badge>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producer</TableHead>
            <TableHead className="text-right">QHH</TableHead>
            <TableHead className="text-right">Quotes</TableHead>
            <TableHead className="text-right">Sales</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Premium</TableHead>
            <TableHead className="text-right">Close %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {producers.map(([name, data]) => (
            <TableRow key={name}>
              <TableCell className="font-medium capitalize">{name}</TableCell>
              <TableCell className="text-right">{data.qhh}</TableCell>
              <TableCell className="text-right">{data.quotes}</TableCell>
              <TableCell className="text-right">{data.sales}</TableCell>
              <TableCell className="text-right">{data.items}</TableCell>
              <TableCell className="text-right">{formatPremium(data.premium)}</TableCell>
              <TableCell className="text-right">{formatCloseRate(data.close_rate)}</TableCell>
            </TableRow>
          ))}

          {/* Team totals row */}
          {teamData && (
            <TableRow className="bg-muted/50 font-medium">
              <TableCell>Team Total</TableCell>
              <TableCell className="text-right">{teamData.qhh}</TableCell>
              <TableCell className="text-right">{teamData.quotes}</TableCell>
              <TableCell className="text-right">{teamData.sales}</TableCell>
              <TableCell className="text-right">{teamData.items}</TableCell>
              <TableCell className="text-right">{formatPremium(teamData.premium)}</TableCell>
              <TableCell className="text-right">{formatCloseRate(teamData.close_rate)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

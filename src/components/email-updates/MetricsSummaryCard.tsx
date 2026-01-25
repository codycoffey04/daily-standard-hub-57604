import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPremium } from '@/utils/metricsParser'

interface DeltaInfo {
  delta: number
  pct: number
}

interface MetricsSummaryCardProps {
  teamSales: number
  teamItems: number
  teamPremium: number
  teamQhh: number
  teamQuotes: number
  deltas: {
    team_items: DeltaInfo
    team_premium: DeltaInfo
    team_sales: DeltaInfo
    team_qhh: DeltaInfo
  } | null
  periodType: 'weekly' | 'monthly'
}

interface StatItemProps {
  label: string
  value: string | number
  delta?: DeltaInfo
  showPct?: boolean
}

const StatItem: React.FC<StatItemProps> = ({ label, value, delta, showPct = true }) => {
  const getDeltaIcon = () => {
    if (!delta) return null
    if (delta.delta > 0) return <TrendingUp className="h-3 w-3 text-green-600" />
    if (delta.delta < 0) return <TrendingDown className="h-3 w-3 text-red-600" />
    return <Minus className="h-3 w-3 text-muted-foreground" />
  }

  const getDeltaColor = () => {
    if (!delta) return ''
    if (delta.delta > 0) return 'text-green-600'
    if (delta.delta < 0) return 'text-red-600'
    return 'text-muted-foreground'
  }

  const formatDelta = () => {
    if (!delta) return null
    const sign = delta.delta > 0 ? '+' : ''
    const pctStr = showPct ? ` (${sign}${delta.pct.toFixed(1)}%)` : ''
    return `${sign}${delta.delta}${pctStr}`
  }

  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-bold">{value}</span>
      {delta && (
        <div className={cn("flex items-center gap-1 text-xs", getDeltaColor())}>
          {getDeltaIcon()}
          <span>{formatDelta()}</span>
        </div>
      )}
    </div>
  )
}

export const MetricsSummaryCard: React.FC<MetricsSummaryCardProps> = ({
  teamSales,
  teamItems,
  teamPremium,
  teamQhh,
  teamQuotes,
  deltas,
  periodType
}) => {
  // Calculate close rate
  const closeRate = teamQhh > 0 ? (teamSales / teamQhh) * 100 : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {periodType === 'weekly' ? 'Weekly' : 'Monthly'} Summary
          {deltas && (
            <span className="text-xs font-normal text-muted-foreground ml-2">
              vs {periodType === 'weekly' ? 'last week' : 'last month'}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatItem
            label="Sales"
            value={teamSales}
            delta={deltas?.team_sales}
          />
          <StatItem
            label="Items"
            value={teamItems}
            delta={deltas?.team_items}
          />
          <StatItem
            label="Premium"
            value={formatPremium(teamPremium)}
            delta={deltas?.team_premium}
          />
          <StatItem
            label="QHH (TDS)"
            value={teamQhh}
            delta={deltas?.team_qhh}
          />
          <StatItem
            label="Quotes"
            value={teamQuotes}
          />
          <StatItem
            label="Close Rate"
            value={`${closeRate.toFixed(1)}%`}
          />
        </div>
      </CardContent>
    </Card>
  )
}

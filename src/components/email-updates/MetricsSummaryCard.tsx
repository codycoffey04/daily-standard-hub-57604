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
  // MTD values
  teamSales: number
  teamItems: number
  teamPremium: number
  teamQhh: number
  teamQuotes: number
  // Weekly values (for "This Week" display)
  weeklyTeamSales: number
  weeklyTeamItems: number
  weeklyTeamPremium: number
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
  weeklyTeamSales,
  weeklyTeamItems,
  weeklyTeamPremium,
  deltas,
  periodType
}) => {
  // Calculate close rate from MTD values
  const closeRate = teamQhh > 0 ? (teamSales / teamQhh) * 100 : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {periodType === 'weekly' ? 'Weekly' : 'Monthly'} Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* This Week section - shows weekly production values with WoW deltas */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">
            This Week
            {deltas && (
              <span className="font-normal ml-1">
                (vs last week)
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatItem
              label="Sales"
              value={weeklyTeamSales}
              delta={deltas?.team_sales}
            />
            <StatItem
              label="Items"
              value={weeklyTeamItems}
              delta={deltas?.team_items}
            />
            <StatItem
              label="Premium"
              value={formatPremium(weeklyTeamPremium)}
              delta={deltas?.team_premium}
            />
          </div>
        </div>

        {/* MTD section - shows MTD totals without deltas */}
        <div className="pt-2 border-t">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            MTD Totals
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatItem
              label="Sales"
              value={teamSales}
            />
            <StatItem
              label="Items"
              value={teamItems}
            />
            <StatItem
              label="Premium"
              value={formatPremium(teamPremium)}
            />
            <StatItem
              label="QHH (TDS)"
              value={teamQhh}
            />
            <StatItem
              label="Close Rate"
              value={`${closeRate.toFixed(1)}%`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

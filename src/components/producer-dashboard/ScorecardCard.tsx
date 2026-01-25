import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy } from 'lucide-react'
import type { ProducerDashboardScorecard } from '@/hooks/useProducerDashboard'

interface ScorecardCardProps {
  scorecard: ProducerDashboardScorecard
}

export const ScorecardCard: React.FC<ScorecardCardProps> = ({ scorecard }) => {
  const formatPremium = (premium: number): string => {
    if (premium >= 1000) {
      return `$${(premium / 1000).toFixed(1)}k`
    }
    return `$${premium.toFixed(0)}`
  }

  const getComplianceColor = (pct: number): string => {
    if (pct >= 75) return 'text-success'
    if (pct >= 50) return 'text-warning'
    return 'text-destructive'
  }

  // Close rate color: agency avg is ~25%
  const getCloseRateColor = (rate: number): string => {
    if (rate >= 30) return 'text-success'
    if (rate >= 22) return 'text-foreground'
    if (rate >= 15) return 'text-warning'
    return 'text-destructive'
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-base">
          <Trophy className="h-4 w-4" />
          <span>Your Scorecard</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {/* Items MTD */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {scorecard.items_mtd}
            </div>
            <div className="text-xs text-muted-foreground">Items MTD</div>
          </div>

          {/* Premium MTD */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              {formatPremium(scorecard.premium_mtd)}
            </div>
            <div className="text-xs text-muted-foreground">Premium MTD</div>
          </div>

          {/* Close Rate */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className={`text-2xl font-bold ${getCloseRateColor(scorecard.close_rate)}`}>
              {scorecard.close_rate}%
            </div>
            <div className="text-xs text-muted-foreground">Close Rate</div>
          </div>

          {/* Framework Compliance */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className={`text-2xl font-bold ${getComplianceColor(scorecard.framework_compliance_pct)}`}>
              {scorecard.framework_compliance_pct}%
            </div>
            <div className="text-xs text-muted-foreground">In Framework</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

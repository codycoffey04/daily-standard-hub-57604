import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { type QHHDetail, type QHHAnalytics } from '@/hooks/useQHHDetails'

interface QHHDetailsCardProps {
  qhhData: QHHDetail[]
  analytics: QHHAnalytics
  reportedTotal: number
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'SOLD': return 'bg-success/10 text-success border-success/20'
    case 'Quoted': return 'bg-primary/10 text-primary border-primary/20'
    case 'ReQuote/X-Date': return 'bg-warning/10 text-warning border-warning/20'
    case 'Attempted Contact': return 'bg-info/10 text-info border-info/20'
    case 'Not Interested – Recycle': return 'bg-warning/10 text-warning border-warning/20'
    case 'Not Interested Now': return 'bg-destructive/10 text-destructive border-destructive/20'
    case 'Bad Lead': return 'bg-destructive/10 text-destructive border-destructive/20'
    default: return 'bg-muted/10 text-muted-foreground border-muted/20'
  }
}

const getStatusIcon = (status: string) => {
  if (['SOLD', 'Quoted'].includes(status)) {
    return <CheckCircle className="h-4 w-4 text-success" />
  }
  if (['Bad Lead', 'Not Interested Now', 'Not Interested – Recycle'].includes(status)) {
    return <XCircle className="h-4 w-4 text-destructive" />
  }
  return <AlertTriangle className="h-4 w-4 text-warning" />
}

export const QHHDetailsCard: React.FC<QHHDetailsCardProps> = ({
  qhhData,
  analytics,
  reportedTotal
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showAnalytics, setShowAnalytics] = useState(true)

  const toggleRowExpansion = (qhhId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(qhhId)) {
      newExpanded.delete(qhhId)
    } else {
      newExpanded.add(qhhId)
    }
    setExpandedRows(newExpanded)
  }

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
  }

  const countMatches = analytics.totalCount === reportedTotal

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">
            Quoted Households Details
          </CardTitle>
          <div className="flex items-center gap-2">
            {countMatches ? (
              <CheckCircle className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <Badge variant={countMatches ? "default" : "destructive"}>
              {analytics.totalCount} entered / {reportedTotal} reported
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Analytics Summary */}
        {showAnalytics && analytics.totalCount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Coaching Insights</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAnalytics(!showAnalytics)}
                >
                  {showAnalytics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              
              {/* Conversion Rate */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  {analytics.conversionRate >= 40 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm font-medium">Overall Conversion Rate</span>
                </div>
                <Badge variant={analytics.conversionRate >= 40 ? "default" : "destructive"}>
                  {analytics.conversionRate.toFixed(1)}%
                </Badge>
              </div>

              {/* Status Breakdown */}
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-2">STATUS SUMMARY</h5>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(analytics.statusBreakdown).map(([status, count]) => (
                    <Badge key={status} className={getStatusColor(status)}>
                      {status}: {count}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Source Performance */}
              {Object.keys(analytics.sourceBreakdown).length > 1 && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">SOURCE PERFORMANCE</h5>
                  <div className="space-y-1">
                    {Object.entries(analytics.sourceBreakdown)
                      .sort(([,a], [,b]) => b.successRate - a.successRate)
                      .map(([source, data]) => (
                      <div key={source} className="flex items-center justify-between text-sm">
                        <span>{source} ({data.count} leads)</span>
                        <Badge variant={data.successRate >= 40 ? "default" : data.successRate > 0 ? "secondary" : "destructive"}>
                          {data.successRate.toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failure Patterns */}
              {analytics.failurePatterns.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">COACHING OPPORTUNITIES</h5>
                  <div className="space-y-1">
                    {analytics.failurePatterns.map((pattern, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm p-2 bg-warning/10 rounded border border-warning/20">
                        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                        <span className="text-warning">{pattern}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}

        {/* QHH Table */}
        {qhhData.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Individual Households</h4>
            <div className="space-y-2">
              {qhhData.map((qhh) => {
                const isExpanded = expandedRows.has(qhh.id)
                return (
                  <Card key={qhh.id} className="border border-border/50">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        
                        {/* Main Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(qhh.quick_action_status)}
                              <span className="font-medium">{qhh.full_name}</span>
                            </div>
                            <Badge className={getStatusColor(qhh.quick_action_status)}>
                              {qhh.quick_action_status}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(qhh.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Summary Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{formatPhone(qhh.phone_number.replace(/\D/g, ''))}</span>
                          </div>
                          <div>
                            <span className="font-medium">Policies:</span> {qhh.policies_quoted}
                          </div>
                          <div>
                            <span className="font-medium">Source:</span> {qhh.source_name}
                          </div>
                          <div className="flex items-center gap-1">
                            {qhh.opted_into_hearsay ? (
                              <CheckCircle className="h-3 w-3 text-success" />
                            ) : (
                              <XCircle className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span>Hearsay</span>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && qhh.notes && (
                          <div className="pt-2 border-t border-border/50">
                            <div className="text-sm">
                              <span className="font-medium text-muted-foreground">Call Notes:</span>
                              <p className="mt-1 text-foreground bg-muted/30 p-3 rounded">
                                {qhh.notes}
                              </p>
                            </div>
                          </div>
                        )}

                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-warning" />
            <p className="font-medium">No QHH Details Entered</p>
            <p className="text-sm">
              {reportedTotal > 0 
                ? `${reportedTotal} QHH reported but no individual details provided`
                : 'No quoted households reported for this entry'
              }
            </p>
          </div>
        )}
        
      </CardContent>
    </Card>
  )
}
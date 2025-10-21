import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Calendar, Phone, Clock, Target, DollarSign } from 'lucide-react'
import { AccountabilityReviewForm } from './AccountabilityReviewForm'
import { format } from 'date-fns'

interface DailyEntryForReview {
  id: string
  entry_date: string
  created_at: string
  outbound_dials: number
  talk_minutes: number
  qhh_total: number
  items_total: number
  sales_total: number
  producer: {
    display_name: string
  }
  has_accountability_review: boolean
}

interface AccountabilityQueueProps {
  entries: DailyEntryForReview[]
  loading: boolean
  onRefresh: () => void
}

export const AccountabilityQueue: React.FC<AccountabilityQueueProps> = ({
  entries,
  loading,
  onRefresh
}) => {
  const [selectedEntry, setSelectedEntry] = useState<DailyEntryForReview | null>(null)
  const [reviewFormOpen, setReviewFormOpen] = useState(false)

  const handleStartReview = (entry: DailyEntryForReview) => {
    setSelectedEntry(entry)
    setReviewFormOpen(true)
  }

  const handleReviewSuccess = () => {
    setSelectedEntry(null)
    setReviewFormOpen(false)
    onRefresh() // Refresh the queue to remove reviewed entries
  }
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">
            Entries Needing Review
          </h2>
          <Badge variant="secondary" className="text-sm">
            {entries.length} entries
          </Badge>
        </div>
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
              <p>No entries need accountability review at this time.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {entries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-medium">
                      {entry.producer.display_name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(entry.entry_date).toLocaleDateString()}
                      </div>
                      {new Date(entry.entry_date).toDateString() !== new Date(entry.created_at).toDateString() && (
                        <Badge variant="outline" className="text-xs">
                          Backdated (submitted {format(new Date(entry.created_at), 'MMM d')})
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => handleStartReview(entry)}
                  >
                    Start Review
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Dials</div>
                      <div className="font-medium">{entry.outbound_dials}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Talk Min</div>
                      <div className="font-medium">{entry.talk_minutes}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">QHH</div>
                      <div className="font-medium">{entry.qhh_total}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Items</div>
                      <div className="font-medium">{entry.items_total}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Sales</div>
                      <div className="font-medium">{entry.sales_total}</div>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center">
                  <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                    Needs Review
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AccountabilityReviewForm
        entry={selectedEntry}
        open={reviewFormOpen}
        onOpenChange={setReviewFormOpen}
        onSuccess={handleReviewSuccess}
      />
    </div>
  )
}
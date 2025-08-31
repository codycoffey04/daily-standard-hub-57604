import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  User,
  Calendar,
  BarChart3,
  Phone,
  MessageSquare,
  Target
} from 'lucide-react'

interface ReviewDetailsModalProps {
  review: {
    id: string
    created_at: string
    entry_date: string
    producer_name: string
    reviewer_name: string
    qhh_total: number
    items_total: number
    sales_total: number
    metrics_achieved: boolean | null
    activities_achieved: string[] | null
    activity_comments: string | null
    call_recording_reviewed: string | null
    sales_checklist: string | null
    call_takeaways: string | null
    weak_steps: string[] | null
    course_corrections_addressed: boolean | null
    quick_meeting_notes: string | null
    expansion_topics: string | null
  }
  isOpen: boolean
  onClose: () => void
}

const WEAK_STEPS_OPTIONS = [
  'Introduction',
  'Needs Assessment', 
  'Product Presentation',
  'Objection Handling',
  'Close',
  'Follow-up'
]

const ACTIVITIES_OPTIONS = [
  'Dials',
  'Talk Time',
  'QHH',
  'Items'
]

export const ReviewDetailsModal: React.FC<ReviewDetailsModalProps> = ({
  review,
  isOpen,
  onClose
}) => {
  const getStatusIcon = (achieved: boolean | null) => {
    if (achieved === true) return <CheckCircle2 className="h-4 w-4 text-success" />
    if (achieved === false) return <XCircle className="h-4 w-4 text-destructive" />
    return <AlertTriangle className="h-4 w-4 text-warning" />
  }

  const getStatusBadge = (achieved: boolean | null) => {
    if (achieved === true) {
      return <Badge className="bg-success text-success-foreground">Yes</Badge>
    }
    if (achieved === false) {
      return <Badge className="bg-destructive text-destructive-foreground">No</Badge>
    }
    return <Badge variant="outline">Not Set</Badge>
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Review Details - {review.producer_name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Calendar className="h-5 w-5" />
                <span>Review Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-sm">{format(new Date(review.entry_date), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Producer</p>
                  <p className="text-sm">{review.producer_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reviewer</p>
                  <p className="text-sm">{review.reviewer_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reviewed At</p>
                  <p className="text-sm">{format(new Date(review.created_at), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                <span>Daily Metrics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{review.qhh_total}</p>
                  <p className="text-sm text-muted-foreground">QHH</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{review.items_total}</p>
                  <p className="text-sm text-muted-foreground">Items</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{review.sales_total}</p>
                  <p className="text-sm text-muted-foreground">Sales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Validation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <CheckCircle2 className="h-5 w-5" />
                <span>Metrics Validation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Metrics Achieved?</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(review.metrics_achieved)}
                  {getStatusBadge(review.metrics_achieved)}
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Activities Achieved:</p>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITIES_OPTIONS.map(activity => {
                    const isAchieved = review.activities_achieved?.includes(activity)
                    return (
                      <Badge
                        key={activity}
                        variant={isAchieved ? "default" : "outline"}
                        className={isAchieved ? "bg-success text-success-foreground" : ""}
                      >
                        {isAchieved && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {activity}
                      </Badge>
                    )
                  })}
                </div>
              </div>

              {review.activity_comments && (
                <div>
                  <p className="text-sm font-medium mb-2">Activity Comments:</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{review.activity_comments}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call Review */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Phone className="h-5 w-5" />
                <span>Call Review</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {review.call_recording_reviewed && (
                <div>
                  <p className="text-sm font-medium mb-2">Call Recording Reference:</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{review.call_recording_reviewed}</p>
                </div>
              )}

              {review.sales_checklist && (
                <div>
                  <p className="text-sm font-medium mb-2">Sales Checklist Adherence:</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{review.sales_checklist}</p>
                </div>
              )}

              {review.call_takeaways && (
                <div>
                  <p className="text-sm font-medium mb-2">Key Takeaways:</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{review.call_takeaways}</p>
                </div>
              )}

              {review.weak_steps && review.weak_steps.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Weak/Skipped Steps:</p>
                  <div className="flex flex-wrap gap-2">
                    {review.weak_steps.map(step => (
                      <Badge key={step} variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        {step}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coaching */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Target className="h-5 w-5" />
                <span>Coaching & Development</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Course Corrections Addressed?</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(review.course_corrections_addressed)}
                  {getStatusBadge(review.course_corrections_addressed)}
                </div>
              </div>

              <Separator />

              {review.quick_meeting_notes && (
                <div>
                  <p className="text-sm font-medium mb-2">Quick Meeting Notes:</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{review.quick_meeting_notes}</p>
                </div>
              )}

              {review.expansion_topics && (
                <div>
                  <p className="text-sm font-medium mb-2">Topics for LSP:</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{review.expansion_topics}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
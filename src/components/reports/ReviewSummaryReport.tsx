import React, { useState } from 'react'
import { useReviewSummary } from '@/hooks/useReviewSummary'
import { AccountabilityReviewForm } from '@/components/AccountabilityReviewForm'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ReviewsEmptyState } from '@/components/ui/reviews-empty-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Pencil } from 'lucide-react'
import { format } from 'date-fns'

interface ReviewSummaryReportProps {
  selectedYear: number
  selectedMonth: number | null
}

export const ReviewSummaryReport: React.FC<ReviewSummaryReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  const { data: reviews, isLoading, error, refetch } = useReviewSummary(selectedYear, selectedMonth)
  
  // State for edit modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<typeof reviews[0] | null>(null)

  // Edit handlers
  const handleEditClick = (review: typeof reviews[0]) => {
    setSelectedReview(review)
    setEditModalOpen(true)
  }

  const handleEditSuccess = () => {
    refetch()
    setEditModalOpen(false)
    setSelectedReview(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load review data: {error.message}
        </AlertDescription>
      </Alert>
    )
  }

  if (!reviews || reviews.length === 0) {
    return <ReviewsEmptyState />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Accountability Review Summary</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {reviews.length} review{reviews.length !== 1 ? 's' : ''} found
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Producer</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Call Reviewed</TableHead>
              <TableHead className="text-center">Sales Gaps</TableHead>
              <TableHead>Coaching Notes</TableHead>
              <TableHead>Strengths</TableHead>
              <TableHead>Action Items</TableHead>
              <TableHead className="text-center">Follow-up</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((review) => (
              <TableRow
                key={review.id}
                className={
                  review.follow_up_required
                    ? 'bg-warning/5 hover:bg-warning/10'
                    : ''
                }
              >
                <TableCell className="font-medium">
                  {format(new Date(review.review_date), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>{review.producer_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {review.reviewer_name}
                </TableCell>
                <TableCell className="max-w-xs">
                  {review.call_reviewed ? (
                    <span className="text-sm">{review.call_reviewed}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {review.sales_process_gaps.length > 0 ? (
                    <Badge variant="destructive">
                      {review.sales_process_gaps.length}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="max-w-xs">
                  {review.coaching_notes ? (
                    <span className="text-sm line-clamp-2">
                      {review.coaching_notes}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="max-w-xs">
                  {review.strengths_noted ? (
                    <span className="text-sm line-clamp-2">
                      {review.strengths_noted}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="max-w-xs">
                  {review.action_items ? (
                    <span className="text-sm line-clamp-2">
                      {review.action_items}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {review.follow_up_required ? (
                    <Badge variant="outline" className="bg-warning/10 text-warning-foreground">
                      {review.follow_up_date 
                        ? format(new Date(review.follow_up_date), 'MMM dd')
                        : 'Required'
                      }
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditClick(review)}
                    className="h-8 w-8 p-0"
                    title="Edit review"
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit review</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Modal */}
      {selectedReview && (
        <AccountabilityReviewForm
          entry={{
            id: selectedReview.raw_review.daily_entry_id,
            entry_date: selectedReview.review_date,
            producer: {
              display_name: selectedReview.producer_name
            },
            outbound_dials: 0,
            talk_minutes: 0,
            qhh_total: 0,
            items_total: 0,
            sales_total: 0,
          }}
          mode="edit"
          existingReview={{
            id: selectedReview.id,
            metrics_achieved: selectedReview.raw_review.metrics_achieved,
            activities_achieved: selectedReview.raw_review.activities_achieved,
            activity_comments: selectedReview.raw_review.activity_comments,
            call_recording_reviewed: selectedReview.raw_review.call_recording_reviewed,
            sales_checklist: selectedReview.raw_review.sales_checklist,
            call_takeaways: selectedReview.raw_review.call_takeaways,
            weak_steps: selectedReview.raw_review.weak_steps,
            course_corrections_addressed: selectedReview.raw_review.course_corrections_addressed,
            quick_meeting_notes: selectedReview.raw_review.quick_meeting_notes,
            expansion_topics: selectedReview.raw_review.expansion_topics,
          }}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}

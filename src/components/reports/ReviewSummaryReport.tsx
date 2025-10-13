import React from 'react'
import { useReviewSummary } from '@/hooks/useReviewSummary'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

interface ReviewSummaryReportProps {
  selectedYear: number
  selectedMonth: number | null
}

export const ReviewSummaryReport: React.FC<ReviewSummaryReportProps> = ({
  selectedYear,
  selectedMonth
}) => {
  const { data: reviews, isLoading, error } = useReviewSummary(selectedYear, selectedMonth)

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
    return (
      <EmptyState
        message="No reviews found for this period"
        suggestion="Try selecting a different time period or check if reviews have been completed"
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Review Summary</h2>
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
              <TableHead className="text-center">Metrics</TableHead>
              <TableHead className="text-center">Weak Steps</TableHead>
              <TableHead className="text-right">QHH</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead>Comments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((review) => (
              <TableRow
                key={review.id}
                className={
                  review.metrics_achieved === false
                    ? 'bg-destructive/5 hover:bg-destructive/10'
                    : ''
                }
              >
                <TableCell className="font-medium">
                  {format(new Date(review.entry_date), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>{review.producer_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {review.reviewer_name}
                </TableCell>
                <TableCell className="text-center">
                  {review.metrics_achieved === null ? (
                    <Badge variant="outline" className="bg-muted">
                      N/A
                    </Badge>
                  ) : review.metrics_achieved ? (
                    <Badge variant="default" className="bg-success text-success-foreground">
                      Yes
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      No
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {review.weak_steps.length > 0 ? (
                    <Badge variant="outline">
                      {review.weak_steps.length}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {review.qhh_total.toFixed(1)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {review.items_total}
                </TableCell>
                <TableCell className="text-right font-mono">
                  ${review.sales_total.toLocaleString()}
                </TableCell>
                <TableCell className="max-w-xs">
                  {review.activity_comments ? (
                    <span className="text-sm line-clamp-2">
                      {review.activity_comments}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      No comments
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Navigation } from '@/components/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReviewDetailsModal } from '@/components/ReviewDetailsModal'
import { CalendarIcon, Eye, Database, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AdminReview {
  id: string
  created_at: string
  daily_entry_id: string
  reviewer_id: string
  metrics_achieved: boolean | null
  weak_steps: string[] | null
  expansion_topics: string | null
  entry_date: string
  producer_name: string
  qhh_total: number
  items_total: number
  sales_total: number
  reviewer_name: string
  // All review fields for modal
  course_corrections_addressed: boolean | null
  sales_checklist: string | null
  call_recording_reviewed: string | null
  activity_comments: string | null
  activities_achieved: string[] | null
  call_takeaways: string | null
  quick_meeting_notes: string | null
}

export const AdminReviewsPage: React.FC = () => {
  // State for filters
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date()
  })
  const [selectedProducer, setSelectedProducer] = useState<string>('all')
  const [issuesOnly, setIssuesOnly] = useState(false)
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null)

  // Fetch reviews data
  const { data: reviews = [], isLoading, error } = useQuery({
    queryKey: ['admin-reviews', dateRange, selectedProducer, issuesOnly],
    queryFn: async () => {
      let query = supabase
        .from('accountability_reviews')
        .select(`
          id,
          created_at,
          daily_entry_id,
          reviewer_id,
          metrics_achieved,
          weak_steps,
          expansion_topics,
          course_corrections_addressed,
          sales_checklist,
          call_recording_reviewed,
          activity_comments,
          activities_achieved,
          call_takeaways,
          quick_meeting_notes,
          daily_entries!inner(
            entry_date,
            qhh_total,
            items_total,
            sales_total,
            producers!inner(
              display_name
            )
          ),
          reviewer:profiles!reviewer_id(
            display_name
          )
        `)
        .gte('daily_entries.entry_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('daily_entries.entry_date', format(dateRange.to, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false })

      if (selectedProducer !== 'all') {
        query = query.eq('daily_entries.producers.id', selectedProducer)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching reviews:', error)
        toast.error('Failed to load reviews')
        throw error
      }

      // Transform the data
      const transformedData = data?.map(review => ({
        id: review.id,
        created_at: review.created_at,
        daily_entry_id: review.daily_entry_id,
        reviewer_id: review.reviewer_id,
        metrics_achieved: review.metrics_achieved,
        weak_steps: review.weak_steps,
        expansion_topics: review.expansion_topics,
        course_corrections_addressed: review.course_corrections_addressed,
        sales_checklist: review.sales_checklist,
        call_recording_reviewed: review.call_recording_reviewed,
        activity_comments: review.activity_comments,
        activities_achieved: review.activities_achieved,
        call_takeaways: review.call_takeaways,
        quick_meeting_notes: review.quick_meeting_notes,
        entry_date: review.daily_entries.entry_date,
        qhh_total: review.daily_entries.qhh_total,
        items_total: review.daily_entries.items_total,
        sales_total: review.daily_entries.sales_total,
        producer_name: review.daily_entries.producers.display_name,
        reviewer_name: review.reviewer?.display_name || 'Unknown'
      })) || []

      return transformedData
    }
  })

  // Fetch producers for dropdown
  const { data: producers = [] } = useQuery({
    queryKey: ['producers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producers')
        .select('id, display_name')
        .eq('active', true)
        .order('display_name')

      if (error) throw error
      return data
    }
  })

  // Filter reviews based on issues only
  const filteredReviews = useMemo(() => {
    if (!issuesOnly) return reviews
    
    return reviews.filter(review => 
      review.metrics_achieved === false || 
      (review.weak_steps && review.weak_steps.length > 0)
    )
  }, [reviews, issuesOnly])

  // Get row styling based on review status
  const getRowClassName = (review: AdminReview) => {
    if (review.metrics_achieved === false) {
      return 'bg-destructive/10 border-destructive/20'
    }
    if (review.weak_steps && review.weak_steps.length > 0) {
      return 'bg-warning/10 border-warning/20'
    }
    return ''
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-lg font-medium">Failed to load reviews</p>
                <p className="text-muted-foreground">Please try again later</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Admin Reviews Dashboard
          </h1>
          <p className="text-muted-foreground">
            View and manage completed accountability reviews
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from && dateRange.to
                        ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
                        : 'Pick dates'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setDateRange({ from: range.from, to: range.to })
                        }
                      }}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Producer Filter */}
              <div className="space-y-2">
                <Label>Producer</Label>
                <Select value={selectedProducer} onValueChange={setSelectedProducer}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Producers</SelectItem>
                    {producers.map(producer => (
                      <SelectItem key={producer.id} value={producer.id}>
                        {producer.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Issues Only Toggle */}
              <div className="space-y-2">
                <Label>Show Issues Only</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={issuesOnly}
                    onCheckedChange={setIssuesOnly}
                  />
                  <span className="text-sm text-muted-foreground">
                    {issuesOnly ? 'Issues only' : 'All reviews'}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2">
                <Label>Summary</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Total: {filteredReviews.length}</p>
                  <p className="text-destructive">
                    Issues: {filteredReviews.filter(r => 
                      r.metrics_achieved === false || 
                      (r.weak_steps && r.weak_steps.length > 0)
                    ).length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No reviews found</p>
                <p className="text-muted-foreground">
                  {issuesOnly ? 'No issues found in the selected period' : 'No reviews in the selected period'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Producer</TableHead>
                    <TableHead>Metrics</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Weak Steps</TableHead>
                    <TableHead>Expansion Topics</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.map((review) => (
                    <TableRow
                      key={review.id}
                      className={getRowClassName(review)}
                    >
                      <TableCell className="font-medium">
                        {format(new Date(review.entry_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{review.producer_name}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <div>QHH: {review.qhh_total}</div>
                          <div>Items: {review.items_total}</div>
                          <div>Sales: {review.sales_total}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {review.metrics_achieved === true ? (
                          <Badge className="bg-success text-success-foreground">
                            Achieved
                          </Badge>
                        ) : review.metrics_achieved === false ? (
                          <Badge className="bg-destructive text-destructive-foreground">
                            Not Achieved
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Set</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {review.weak_steps && review.weak_steps.length > 0 ? (
                          <div className="max-w-32 truncate text-xs">
                            {review.weak_steps.join(', ')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {review.expansion_topics ? (
                          <div className="max-w-32 truncate text-xs">
                            {review.expansion_topics}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {review.reviewer_name}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReview(review)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Details Modal */}
      {selectedReview && (
        <ReviewDetailsModal
          review={selectedReview}
          isOpen={!!selectedReview}
          onClose={() => setSelectedReview(null)}
        />
      )}
    </div>
  )
}
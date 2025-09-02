import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, Clock, Target, DollarSign, Calendar } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { QHHDetailsCard } from '@/components/QHHDetailsCard'
import { useQHHDetails } from '@/hooks/useQHHDetails'

interface DailyEntryForReview {
  id: string
  entry_date: string
  outbound_dials: number
  talk_minutes: number
  qhh_total: number
  items_total: number
  sales_total: number
  producer: {
    display_name: string
  }
}

interface AccountabilityReviewFormProps {
  entry: DailyEntryForReview | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const weakStepsOptions = [
  'Introduction',
  'Needs Assessment',
  'Product Presentation',
  'Objection Handling',
  'Close',
  'Follow-up'
]

const activitiesOptions = [
  'Dials',
  'Talk Time',
  'QHH',
  'Items'
]

const formSchema = z.object({
  metrics_achieved: z.boolean(),
  activities_achieved: z.array(z.string()).default([]),
  activity_comments: z.string().optional(),
  call_recording_reviewed: z.string().min(1, 'Call recording reference is required'),
  sales_checklist: z.string().optional(),
  call_takeaways: z.string().optional(),
  weak_steps: z.array(z.string()).default([]),
  course_corrections_addressed: z.boolean(),
  quick_meeting_notes: z.string().optional(),
  expansion_topics: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export const AccountabilityReviewForm: React.FC<AccountabilityReviewFormProps> = ({
  entry,
  open,
  onOpenChange,
  onSuccess
}) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch QHH details for the entry
  const { data: qhhDetails, isLoading: qhhLoading } = useQHHDetails(entry?.id || null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      metrics_achieved: false,
      activities_achieved: [],
      activity_comments: '',
      call_recording_reviewed: '',
      sales_checklist: '',
      call_takeaways: '',
      weak_steps: [],
      course_corrections_addressed: false,
      quick_meeting_notes: '',
      expansion_topics: '',
    }
  })

  const handleSubmit = async (data: FormData) => {
    if (!entry || !user) return

    try {
      setIsSubmitting(true)

      const { error } = await supabase
        .from('accountability_reviews')
        .insert({
          daily_entry_id: entry.id,
          reviewer_id: user.id,
          metrics_achieved: data.metrics_achieved,
          activities_achieved: data.activities_achieved,
          activity_comments: data.activity_comments || null,
          call_recording_reviewed: data.call_recording_reviewed,
          sales_checklist: data.sales_checklist || null,
          call_takeaways: data.call_takeaways || null,
          weak_steps: data.weak_steps,
          course_corrections_addressed: data.course_corrections_addressed,
          quick_meeting_notes: data.quick_meeting_notes || null,
          expansion_topics: data.expansion_topics || null,
        })

      if (error) {
        throw error
      }

      toast({
        title: 'Review Saved',
        description: `Accountability review completed for ${entry.producer.display_name}`,
      })

      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Error saving review:', error)
      toast({
        title: 'Error',
        description: 'Failed to save accountability review. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!entry) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Accountability Review - {entry.producer.display_name}
          </DialogTitle>
        </DialogHeader>

        {/* Entry Metrics Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">
                Entry Metrics
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {new Date(entry.entry_date).toLocaleDateString()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Sales</div>
                  <div className="font-medium">${entry.sales_total}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QHH Details Section */}
        {qhhLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="text-muted-foreground">Loading QHH details...</div>
            </CardContent>
          </Card>
        ) : qhhDetails ? (
          <QHHDetailsCard 
            qhhData={qhhDetails.qhh}
            analytics={qhhDetails.analytics}
            reportedTotal={entry.qhh_total}
          />
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Metrics Validation Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Metrics Validation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="metrics_achieved"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Metrics Achieved?</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="activities_achieved"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-base">Which activities achieved?</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        {activitiesOptions.map((activity) => (
                          <FormField
                            key={activity}
                            control={form.control}
                            name="activities_achieved"
                            render={({ field }) => (
                              <FormItem
                                key={activity}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(activity)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, activity])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== activity
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {activity}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="activity_comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Comments</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional comments about activity achievement..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Call Review Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Call Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="call_recording_reviewed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Call Recording Reviewed *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Reference or link to reviewed call..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sales_checklist"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales Checklist Adherence</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="How well did the producer follow the sales checklist..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="call_takeaways"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Takeaways</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Key insights from the call review..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weak_steps"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-base">Weak/Skipped Steps</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        {weakStepsOptions.map((step) => (
                          <FormField
                            key={step}
                            control={form.control}
                            name="weak_steps"
                            render={({ field }) => (
                              <FormItem
                                key={step}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(step)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, step])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== step
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {step}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Coaching Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Coaching</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="course_corrections_addressed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Course Corrections Addressed?</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quick_meeting_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quick Meeting Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notes from the accountability meeting..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expansion_topics"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Topics for LSP</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Topics to discuss in Leadership Standard Practice..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Review'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
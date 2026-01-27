import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useCreateCSRActivity, MANUAL_ACTIVITY_TYPES, ManualActivityType } from '@/hooks/useCSRActivities';

const formSchema = z.object({
  activity_type: z.enum([
    'google_review',
    'retention_save',
    'new_customer_referral',
    'winback_closed',
    'winback_quoted'
  ] as const),
  verification_id: z.string().optional(),
  reference_note: z.string().optional(),
  activity_date: z.date()
}).refine(
  (data) => (data.verification_id && data.verification_id.trim() !== '') ||
            (data.reference_note && data.reference_note.trim() !== ''),
  {
    message: 'Either Policy/Quote # or Reference Note is required',
    path: ['verification_id']
  }
);

type FormValues = z.infer<typeof formSchema>;

interface ActivityLogFormProps {
  csrProfileId: string;
  onSuccess?: () => void;
}

export const ActivityLogForm = ({ csrProfileId, onSuccess }: ActivityLogFormProps) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastEarnedPoints, setLastEarnedPoints] = useState(0);
  const createActivity = useCreateCSRActivity();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activity_type: undefined,
      verification_id: '',
      reference_note: '',
      activity_date: new Date()
    }
  });

  const selectedType = form.watch('activity_type');
  const selectedPoints = MANUAL_ACTIVITY_TYPES.find(t => t.value === selectedType)?.points || 0;

  const onSubmit = async (values: FormValues) => {
    try {
      await createActivity.mutateAsync({
        csr_profile_id: csrProfileId,
        activity_type: values.activity_type as ManualActivityType,
        points: selectedPoints,
        activity_date: format(values.activity_date, 'yyyy-MM-dd'),
        verification_id: values.verification_id || '',
        notes: values.reference_note || ''
      });

      // Show success animation with the points just earned
      setLastEarnedPoints(selectedPoints);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      // Reset form
      form.reset({
        activity_type: undefined,
        verification_id: '',
        reference_note: '',
        activity_date: new Date()
      });

      onSuccess?.();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Log Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Activity Type - Large touch target */}
            <FormField
              control={form.control}
              name="activity_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Select activity type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MANUAL_ACTIVITY_TYPES.map((type) => (
                        <SelectItem
                          key={type.value}
                          value={type.value}
                          className="h-12 text-base"
                        >
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{type.label}</span>
                            <span className="text-muted-foreground text-sm">
                              +{type.points} pts
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Policy/Quote # - Large input */}
            <FormField
              control={form.control}
              name="verification_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy # or Quote #</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter policy or quote number"
                      className="h-12 text-base"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter policy number for closed business, quote number for pending
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reference Note - Large input */}
            <FormField
              control={form.control}
              name="reference_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Note</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Producer name, date, or internal reference"
                      className="h-12 text-base"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Producer name, date, or internal reference only. No customer names or contact info.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Picker */}
            <FormField
              control={form.control}
              name="activity_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full h-12 text-base justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button - Large and prominent */}
            <Button
              type="submit"
              disabled={createActivity.isPending || !selectedType}
              className={cn(
                'w-full h-14 text-lg font-semibold transition-all',
                showSuccess && 'bg-green-600 hover:bg-green-600'
              )}
            >
              {createActivity.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Logging...
                </>
              ) : showSuccess ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  +{lastEarnedPoints} Points!
                </>
              ) : (
                <>
                  Log Activity
                  {selectedPoints > 0 && (
                    <span className="ml-2 opacity-75">(+{selectedPoints} pts)</span>
                  )}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

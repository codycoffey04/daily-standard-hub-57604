import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Wand2, RefreshCw, Clock, AlertCircle } from 'lucide-react'
import type { PeriodType } from '@/hooks/useEmailMetrics'

interface EmailGeneratorProps {
  emailMetricsId: string | undefined
  periodType: PeriodType
  periodStart: string
  periodEnd: string
  hasExistingEmail: boolean
  generationStatus: 'idle' | 'generating' | 'completed' | 'error'
  isGenerating: boolean
  existingEmailTimestamp?: string
  onGenerate: (announcements: string) => void
}

export const EmailGenerator: React.FC<EmailGeneratorProps> = ({
  emailMetricsId,
  periodType,
  periodStart,
  periodEnd,
  hasExistingEmail,
  generationStatus,
  isGenerating,
  existingEmailTimestamp,
  onGenerate
}) => {
  const [announcements, setAnnouncements] = useState('')

  const canGenerate = !!emailMetricsId && !isGenerating

  const handleGenerate = () => {
    if (canGenerate) {
      onGenerate(announcements)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-4">
      {!emailMetricsId && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Save production metrics before generating an email.
          </AlertDescription>
        </Alert>
      )}

      {hasExistingEmail && existingEmailTimestamp && (
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              Last generated: {formatTimestamp(existingEmailTimestamp)}
            </span>
          </div>
          <Badge variant="secondary">Regenerate to update</Badge>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Announcements / Updates (optional)
        </label>
        <Textarea
          value={announcements}
          onChange={(e) => setAnnouncements(e.target.value)}
          placeholder={`Add any announcements to include in the email:
- Policy changes
- Personnel updates
- Promotions or incentives
- Life insurance reminders
- Upcoming events`}
          className="min-h-[120px]"
          disabled={isGenerating}
        />
        <p className="text-xs text-muted-foreground">
          These will be included in the "Announcements" section of the email.
        </p>
      </div>

      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          {generationStatus === 'generating' && (
            <Badge variant="outline" className="animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Generating...
            </Badge>
          )}
          {generationStatus === 'completed' && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Generation complete
            </Badge>
          )}
          {generationStatus === 'error' && (
            <Badge variant="destructive">
              Generation failed
            </Badge>
          )}
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex items-center gap-2"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : hasExistingEmail ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Regenerate {periodType === 'weekly' ? 'Weekly' : 'Monthly'} Email
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Generate {periodType === 'weekly' ? 'Weekly' : 'Monthly'} Email
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

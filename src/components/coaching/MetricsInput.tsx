import React from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Save, RefreshCw } from 'lucide-react'

interface MetricsInputProps {
  rawPaste: string
  onRawPasteChange: (value: string) => void
  parseError: string | null
  onSave: () => void
  isSaving: boolean
  hasExistingMetrics: boolean
}

export const MetricsInput: React.FC<MetricsInputProps> = ({
  rawPaste,
  onRawPasteChange,
  parseError,
  onSave,
  isSaving,
  hasExistingMetrics
}) => {
  const placeholderText = `Paste AgencyZoom data here...

Example format (tab-separated):
Producer\tQHH\tQuotes\tSales\tItems\tPremium\tClose Rate
Maria\t23\t32\t2\t8\t4217.69\t8.7%
Kimberly\t18\t27\t0\t0\t0\t0%`

  return (
    <div className="space-y-4">
      <Textarea
        value={rawPaste}
        onChange={(e) => onRawPasteChange(e.target.value)}
        placeholder={placeholderText}
        className="min-h-[200px] font-mono text-sm"
      />

      {parseError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {hasExistingMetrics
            ? 'Metrics already saved for this week. Saving again will overwrite.'
            : 'Paste data from AgencyZoom weekly production report.'}
        </p>

        <Button
          onClick={onSave}
          disabled={isSaving || !rawPaste.trim()}
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {hasExistingMetrics ? 'Update Metrics' : 'Save Metrics'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

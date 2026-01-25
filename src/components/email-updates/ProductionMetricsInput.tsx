import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, Save, RefreshCw, Upload, FileText, CheckCircle, Calendar, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPremium, type ParsedMetrics } from '@/utils/metricsParser'

interface ProductionMetricsInputProps {
  // MTD production (for VC pacing)
  rawMtdPaste: string
  onRawMtdPasteChange: (value: string) => void
  parsedMtdMetrics: ParsedMetrics | null
  mtdParseError: string | null
  // Weekly production (for WoW deltas)
  rawWeeklyPaste: string
  onRawWeeklyPasteChange: (value: string) => void
  parsedWeeklyMetrics: ParsedMetrics | null
  weeklyParseError: string | null
  // Actions
  onSave: () => void
  isSaving: boolean
  hasExistingMetrics: boolean
}

interface SingleInputSectionProps {
  label: string
  helperText: string
  rawPaste: string
  onRawPasteChange: (value: string) => void
  parsedMetrics: ParsedMetrics | null
  parseError: string | null
  icon: React.ReactNode
  hasSavedData: boolean
}

const SingleInputSection: React.FC<SingleInputSectionProps> = ({
  label,
  helperText,
  rawPaste,
  onRawPasteChange,
  parsedMetrics,
  parseError,
  icon,
  hasSavedData
}) => {
  const [csvFileName, setCsvFileName] = useState<string>('')

  const placeholderText = `Paste AgencyZoom production data here...

Expected CSV format:
Producer,Items,Premium,L&H Premium,Policies,Sales,Points,Revenue
Kimberly Fletcher,18,"$11,088",0,8,6,185,$998
Maria Rocha-Guzman,13,"$8,797",0,7,6,135,$792

Or tab-separated format from AgencyZoom.`

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setCsvFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      onRawPasteChange(content)
    }
    reader.readAsText(file)
  }, [onRawPasteChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  })

  const clearFile = () => {
    setCsvFileName('')
    onRawPasteChange('')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-medium">{label}</h3>
        </div>
        {hasSavedData && !rawPaste.trim() && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Saved
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {helperText}
      </p>

      <Tabs defaultValue="csv" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="csv" className="flex items-center gap-1 text-xs">
            <Upload className="h-3 w-3" />
            Upload CSV
          </TabsTrigger>
          <TabsTrigger value="paste" className="flex items-center gap-1 text-xs">
            <FileText className="h-3 w-3" />
            Paste Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="mt-3">
          {!csvFileName ? (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-xs text-primary">Drop the CSV file here...</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Drag & drop AgencyZoom CSV
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{csvFileName}</span>
                {parsedMetrics && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={clearFile}>
                Clear
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="paste" className="mt-3">
          <Textarea
            value={rawPaste}
            onChange={(e) => onRawPasteChange(e.target.value)}
            placeholder={placeholderText}
            className="min-h-[100px] font-mono text-xs"
          />
        </TabsContent>
      </Tabs>

      {parseError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription className="text-xs">{parseError}</AlertDescription>
        </Alert>
      )}

      {parsedMetrics && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Preview</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs py-1">Producer</TableHead>
                  <TableHead className="text-xs py-1 text-right">Sales</TableHead>
                  <TableHead className="text-xs py-1 text-right">Items</TableHead>
                  <TableHead className="text-xs py-1 text-right">Premium</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(parsedMetrics.producers).map(([key, metrics]) => (
                  <TableRow key={key}>
                    <TableCell className="text-xs py-1 font-medium capitalize">{key}</TableCell>
                    <TableCell className="text-xs py-1 text-right">{metrics.sales}</TableCell>
                    <TableCell className="text-xs py-1 text-right">{metrics.items}</TableCell>
                    <TableCell className="text-xs py-1 text-right">{formatPremium(metrics.premium)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell className="text-xs py-1">Team Total</TableCell>
                  <TableCell className="text-xs py-1 text-right">{parsedMetrics.team.sales}</TableCell>
                  <TableCell className="text-xs py-1 text-right">{parsedMetrics.team.items}</TableCell>
                  <TableCell className="text-xs py-1 text-right">{formatPremium(parsedMetrics.team.premium)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

export const ProductionMetricsInput: React.FC<ProductionMetricsInputProps> = ({
  rawMtdPaste,
  onRawMtdPasteChange,
  parsedMtdMetrics,
  mtdParseError,
  rawWeeklyPaste,
  onRawWeeklyPasteChange,
  parsedWeeklyMetrics,
  weeklyParseError,
  onSave,
  isSaving,
  hasExistingMetrics
}) => {
  const hasMtdData = rawMtdPaste.trim().length > 0
  const hasWeeklyData = rawWeeklyPaste.trim().length > 0
  const canSave = hasMtdData || hasWeeklyData

  return (
    <div className="space-y-6">
      {/* MTD Production */}
      <SingleInputSection
        label="MTD Production (Month-to-Date)"
        helperText="AgencyZoom → Reports → Sales → Filter: January 1 - today → Export CSV"
        rawPaste={rawMtdPaste}
        onRawPasteChange={onRawMtdPasteChange}
        parsedMetrics={parsedMtdMetrics}
        parseError={mtdParseError}
        icon={<Calendar className="h-4 w-4 text-blue-500" />}
        hasSavedData={hasExistingMetrics}
      />

      <div className="border-t" />

      {/* Weekly Production */}
      <SingleInputSection
        label="This Week's Production"
        helperText="AgencyZoom → Reports → Sales → Filter: Monday - Friday of current week → Export CSV"
        rawPaste={rawWeeklyPaste}
        onRawPasteChange={onRawWeeklyPasteChange}
        parsedMetrics={parsedWeeklyMetrics}
        parseError={weeklyParseError}
        icon={<CalendarDays className="h-4 w-4 text-green-500" />}
        hasSavedData={hasExistingMetrics}
      />

      <div className="flex items-center justify-end pt-2 border-t">
        <Button
          onClick={onSave}
          disabled={isSaving || !canSave}
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
              {hasExistingMetrics ? 'Update Production' : 'Save Production'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

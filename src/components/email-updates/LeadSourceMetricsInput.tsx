import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Save, RefreshCw, Upload, FileText, CheckCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPremium, type LeadSourceMetrics } from '@/utils/metricsParser'

interface ParsedSourceWithMapping extends LeadSourceMetrics {
  mapped_source_name: string
  is_csr: boolean
  attributed_to?: string
}

interface LeadSourceMetricsInputProps {
  rawPaste: string
  onRawPasteChange: (value: string) => void
  parsedLeadSources: ParsedSourceWithMapping[] | null
  parsedTotals: { items: number; premium: number; policies: number; sales: number; points: number } | null
  csrTotals: { sources: ParsedSourceWithMapping[]; totals: { items: number; premium: number } } | null
  parseError: string | null
  onSave: () => void
  isSaving: boolean
  hasExistingData: boolean
  disabled?: boolean
}

export const LeadSourceMetricsInput: React.FC<LeadSourceMetricsInputProps> = ({
  rawPaste,
  onRawPasteChange,
  parsedLeadSources,
  parsedTotals,
  csrTotals,
  parseError,
  onSave,
  isSaving,
  hasExistingData,
  disabled = false
}) => {
  const [csvFileName, setCsvFileName] = useState<string>('')

  const placeholderText = `Paste AgencyZoom lead source data here...

Expected CSV format:
Lead Source,Items,Premium,L&H Premium,Policies,Sales,Points,Revenue
Net Leads,12,"$8,500",0,6,5,120,$750
Crystal,5,"$3,200",0,3,2,65,$280
Referral,8,"$5,100",0,4,3,85,$400

Source names will be automatically mapped (e.g., "Crystal" + "Crystal Brozio" → "Crystal (CSR)")`

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
    maxFiles: 1,
    disabled
  })

  const clearFile = () => {
    setCsvFileName('')
    onRawPasteChange('')
  }

  if (disabled) {
    return (
      <div className="space-y-4 opacity-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">AgencyZoom Lead Source Data</h3>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Save production metrics first before adding lead source data.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">AgencyZoom Lead Source Data</h3>
        {hasExistingData && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Saved
          </span>
        )}
      </div>

      <Tabs defaultValue="csv" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="csv" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload CSV
          </TabsTrigger>
          <TabsTrigger value="paste" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Paste Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="mt-4 space-y-4">
          {!csvFileName ? (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-sm text-primary">Drop the CSV file here...</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground font-medium">
                    Drag & drop AgencyZoom CSV here
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    "Lead Source Breakdown" report
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{csvFileName}</span>
                {parsedLeadSources && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={clearFile}>
                Clear
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="paste" className="mt-4">
          <Textarea
            value={rawPaste}
            onChange={(e) => onRawPasteChange(e.target.value)}
            placeholder={placeholderText}
            className="min-h-[150px] font-mono text-sm"
          />
        </TabsContent>
      </Tabs>

      {parseError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      {parsedLeadSources && parsedLeadSources.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Preview (sorted by items)</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedLeadSources.map((source, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{source.mapped_source_name}</span>
                        {source.is_csr && (
                          <Badge variant="secondary" className="text-xs">
                            <User className="h-3 w-3 mr-1" />
                            CSR
                          </Badge>
                        )}
                      </div>
                      {source.source_name_raw !== source.mapped_source_name && (
                        <span className="text-xs text-muted-foreground">
                          from: {source.source_name_raw}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{source.items}</TableCell>
                    <TableCell className="text-right">{formatPremium(source.premium)}</TableCell>
                    <TableCell className="text-right">{source.sales}</TableCell>
                    <TableCell className="text-right">{source.points}</TableCell>
                  </TableRow>
                ))}
                {parsedTotals && (
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{parsedTotals.items}</TableCell>
                    <TableCell className="text-right">{formatPremium(parsedTotals.premium)}</TableCell>
                    <TableCell className="text-right">{parsedTotals.sales}</TableCell>
                    <TableCell className="text-right">{parsedTotals.points}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {csrTotals && csrTotals.sources.length > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  CSR Referral Total
                </span>
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {csrTotals.totals.items} items | {formatPremium(csrTotals.totals.premium)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end">
        <Button
          onClick={onSave}
          disabled={isSaving || !rawPaste.trim() || !parsedLeadSources}
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
              {hasExistingData ? 'Update' : 'Save Lead Sources'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, Save, RefreshCw, Upload, FileText, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseAgencyZoomCSV, formatPremium, type ParsedMetrics } from '@/utils/metricsParser'

interface ProductionMetricsInputProps {
  rawPaste: string
  onRawPasteChange: (value: string) => void
  parsedMetrics: ParsedMetrics | null
  parseError: string | null
  onSave: () => void
  isSaving: boolean
  hasExistingMetrics: boolean
}

export const ProductionMetricsInput: React.FC<ProductionMetricsInputProps> = ({
  rawPaste,
  onRawPasteChange,
  parsedMetrics,
  parseError,
  onSave,
  isSaving,
  hasExistingMetrics
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">AgencyZoom Production Data</h3>
        {hasExistingMetrics && (
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
                    "Producer Breakdown" report
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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

      {parsedMetrics && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Preview</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producer</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead className="text-right">Policies</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(parsedMetrics.producers).map(([key, metrics]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium capitalize">{key}</TableCell>
                    <TableCell className="text-right">{metrics.sales}</TableCell>
                    <TableCell className="text-right">{metrics.items}</TableCell>
                    <TableCell className="text-right">{formatPremium(metrics.premium)}</TableCell>
                    <TableCell className="text-right">{metrics.qhh}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell>Team Total</TableCell>
                  <TableCell className="text-right">{parsedMetrics.team.sales}</TableCell>
                  <TableCell className="text-right">{parsedMetrics.team.items}</TableCell>
                  <TableCell className="text-right">{formatPremium(parsedMetrics.team.premium)}</TableCell>
                  <TableCell className="text-right">{parsedMetrics.team.qhh}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end">
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
              {hasExistingMetrics ? 'Update' : 'Save Production'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

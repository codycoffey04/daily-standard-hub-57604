import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, Save, RefreshCw, Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseAgencyZoomCSV, formatPremium, formatCloseRate, type ParseResult, type ProducerMetrics } from '@/utils/metricsParser'

interface MetricsInputProps {
  rawPaste: string
  onRawPasteChange: (value: string) => void
  parseError: string | null
  onSave: () => void
  isSaving: boolean
  hasExistingMetrics: boolean
  producers: Array<{ id: string; display_name: string }>
}

interface CSVPreviewRow {
  producerName: string
  producerKey: string | null
  matchedProducerId: string | null
  metrics: ProducerMetrics
}

export const MetricsInput: React.FC<MetricsInputProps> = ({
  rawPaste,
  onRawPasteChange,
  parseError,
  onSave,
  isSaving,
  hasExistingMetrics,
  producers
}) => {
  const [csvContent, setCsvContent] = useState<string>('')
  const [csvParseResult, setCsvParseResult] = useState<ParseResult | null>(null)
  const [csvFileName, setCsvFileName] = useState<string>('')

  const placeholderText = `Paste AgencyZoom data here...

Example format (tab-separated):
Producer\tQHH\tQuotes\tSales\tItems\tPremium\tClose Rate
Maria\t23\t32\t2\t8\t4217.69\t8.7%
Kimberly\t18\t27\t0\t0\t0\t0%`

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setCsvFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setCsvContent(content)

      // Parse the CSV
      const result = parseAgencyZoomCSV(content)
      setCsvParseResult(result)

      // If successful, also set raw paste for saving
      if (result.success && result.data) {
        // Convert to the format expected by the existing save logic
        const lines = ['Producer\tItems\tPremium\tPolicies\tSales\tClose Rate']
        Object.entries(result.data.producers).forEach(([key, metrics]) => {
          lines.push(`${key}\t${metrics.items}\t${metrics.premium}\t${metrics.qhh}\t${metrics.sales}\t${metrics.close_rate}%`)
        })
        onRawPasteChange(lines.join('\n'))
      }
    }
    reader.readAsText(file)
  }, [onRawPasteChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1
  })

  const getPreviewRows = (): CSVPreviewRow[] => {
    if (!csvParseResult?.success || !csvParseResult.data) return []

    return Object.entries(csvParseResult.data.producers).map(([key, metrics]) => {
      // Find matching producer in DB
      const matchedProducer = producers.find(p =>
        p.display_name.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(p.display_name.toLowerCase().split(' ')[0])
      )

      // Get original producer name from CSV for display
      const lines = csvContent.split('\n')
      let originalName = key
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].toLowerCase()
        if (line.includes(key.toLowerCase())) {
          // Extract the producer name from the line
          const parts = lines[i].split(',')
          if (parts[0]) {
            originalName = parts[0].trim()
            break
          }
        }
      }

      return {
        producerName: originalName,
        producerKey: key,
        matchedProducerId: matchedProducer?.id || null,
        metrics
      }
    })
  }

  const clearCSV = () => {
    setCsvContent('')
    setCsvParseResult(null)
    setCsvFileName('')
  }

  return (
    <div className="space-y-4">
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
          {!csvContent ? (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-sm text-primary">Drop the CSV file here...</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground font-medium">
                    Drag & drop AgencyZoom CSV here, or click to select
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Export "Sales Report" from AgencyZoom
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{csvFileName}</span>
                  {csvParseResult?.success && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={clearCSV}>
                  Clear
                </Button>
              </div>

              {csvParseResult?.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{csvParseResult.error}</AlertDescription>
                </Alert>
              )}

              {csvParseResult?.success && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Preview</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producer</TableHead>
                          <TableHead className="text-right">QHH</TableHead>
                          <TableHead className="text-right">Sales</TableHead>
                          <TableHead className="text-right">Items</TableHead>
                          <TableHead className="text-right">Premium</TableHead>
                          <TableHead className="text-right">Close %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getPreviewRows().map((row) => (
                          <TableRow key={row.producerKey}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {row.matchedProducerId ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                )}
                                <span>{row.producerName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{row.metrics.qhh}</TableCell>
                            <TableCell className="text-right">{row.metrics.sales}</TableCell>
                            <TableCell className="text-right">{row.metrics.items}</TableCell>
                            <TableCell className="text-right">{formatPremium(row.metrics.premium)}</TableCell>
                            <TableCell className="text-right">{formatCloseRate(row.metrics.close_rate)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 inline mr-1 text-green-500" />
                    = Matched to producer in database
                    <AlertTriangle className="h-3 w-3 inline ml-3 mr-1 text-yellow-500" />
                    = Producer not found (will be skipped)
                  </p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paste" className="mt-4">
          <Textarea
            value={rawPaste}
            onChange={(e) => onRawPasteChange(e.target.value)}
            placeholder={placeholderText}
            className="min-h-[200px] font-mono text-sm"
          />
        </TabsContent>
      </Tabs>

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
            : 'Upload CSV or paste data from AgencyZoom weekly production report.'}
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

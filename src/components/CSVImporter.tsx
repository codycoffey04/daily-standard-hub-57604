import React, { useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Upload, FileText, CheckCircle, AlertTriangle, Download } from 'lucide-react'

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  processedRows: any[]
}

export const CSVImporter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [strictMode, setStrictMode] = useState(true)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [importComplete, setImportComplete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setValidationResult(null)
      setImportComplete(false)
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive"
      })
    }
  }

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const rows = []

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue
      
      const values = lines[i].split(',')
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || ''
      })
      
      rows.push(row)
    }

    return rows
  }

  const validateData = async (rows: any[]): Promise<ValidationResult> => {
    const errors: string[] = []
    const warnings: string[] = []
    const processedRows: any[] = []

    // Load sources for validation
    const { data: sources } = await supabase
      .from('sources')
      .select('*')
      .eq('active', true)
      .order('sort_order')

    const sourceMap = new Map(sources?.map(s => [s.name.toLowerCase(), s]) || [])

    // Load producers for validation
    const { data: producers } = await supabase
      .from('producers')
      .select('*')
      .eq('active', true)

    const producerMap = new Map(producers?.map(p => [p.email.toLowerCase(), p]) || [])

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // Account for header row

      try {
        // Required fields validation
        if (!row.producer_email) {
          errors.push(`Row ${rowNum}: Missing producer_email`)
          continue
        }

        if (!row.entry_date) {
          errors.push(`Row ${rowNum}: Missing entry_date`)
          continue
        }

        // Producer validation
        const producer = producerMap.get(row.producer_email.toLowerCase())
        if (!producer) {
          errors.push(`Row ${rowNum}: Unknown producer ${row.producer_email}`)
          continue
        }

        // Date validation
        const entryDate = new Date(row.entry_date)
        const today = new Date()
        if (entryDate > today) {
          errors.push(`Row ${rowNum}: Entry date cannot be in the future`)
          continue
        }

        // Numeric field validation
        const outboundDials = parseInt(row.outbound_dials || '0')
        const talkMinutes = parseInt(row.talk_minutes || '0')
        const itemsTotal = parseInt(row.items_total || '0')

        if (outboundDials < 0 || talkMinutes< 0 || itemsTotal < 0) {
          errors.push(`Row ${rowNum}: All numeric values must be non-negative`)
          continue
        }

        // Build source data
        const bySource: any = {}
        let sourceItemsSum = 0

        sources?.forEach(source => {
          const slug = source.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
          const qhh = parseInt(row[`${slug}_qhh`] || '0')
          const quotes = parseInt(row[`${slug}_quotes`] || '0')
          const items = parseInt(row[`${slug}_items`] || '0')

          if (qhh < 0 || quotes < 0 || items < 0) {
            errors.push(`Row ${rowNum}: Source ${source.name} values must be non-negative`)
            return
          }

          bySource[slug] = { qhh, quotes, items }
          sourceItemsSum += items
        })

        // Items total validation
        if (itemsTotal !== sourceItemsSum) {
          errors.push(`Row ${rowNum}: Items total (${itemsTotal}) must equal sum of items by source (${sourceItemsSum})`)
          continue
        }

        processedRows.push({
          producer_email: row.producer_email,
          entry_date: row.entry_date,
          outbound_dials: outboundDials,
          talk_minutes: talkMinutes,
          items_total: itemsTotal,
          by_source: bySource
        })

      } catch (error) {
        errors.push(`Row ${rowNum}: ${error}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      processedRows
    }
  }

  const handleValidate = async () => {
    if (!file) return

    setLoading(true)
    try {
      const csvText = await file.text()
      const rows = parseCSV(csvText)
      const result = await validateData(rows)
      setValidationResult(result)

      if (result.isValid) {
        toast({
          title: "Validation Passed",
          description: `${result.processedRows.length} rows ready for import`
        })
      } else {
        toast({
          title: "Validation Failed",
          description: `${result.errors.length} errors found`,
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error('Validation error:', error)
      toast({
        title: "Validation Error",
        description: error.message || "Failed to validate CSV",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!validationResult?.isValid) return

    setLoading(true)
    try {
      let successCount = 0
      let errorCount = 0

      for (const row of validationResult.processedRows) {
        try {
          const { error } = await supabase.rpc('save_daily_entry', {
            p_producer_email: row.producer_email,
            p_entry_date: row.entry_date,
            p_outbound_dials: row.outbound_dials,
            p_talk_minutes: row.talk_minutes,
            p_items_total: row.items_total,
            p_by_source: row.by_source
          })

          if (error) {
            console.error('Import error for row:', row, error)
            errorCount++
          } else {
            successCount++
          }
        } catch (error) {
          console.error('Import error for row:', row, error)
          errorCount++
        }
      }

      setImportComplete(true)
      toast({
        title: "Import Complete",
        description: `${successCount} entries imported successfully${errorCount > 0 ? `, ${errorCount} errors` : ''}`
      })

    } catch (error: any) {
      console.error('Import error:', error)
      toast({
        title: "Import Error",
        description: error.message || "Failed to import data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const headers = [
      'producer_email',
      'entry_date',
      'outbound_dials',
      'talk_minutes',
      'items_total',
      // Source columns will be added dynamically
      'digital_marketing_qhh',
      'digital_marketing_quotes',
      'digital_marketing_items',
      'net_lead_qhh',
      'net_lead_quotes',
      'net_lead_items',
      'direct_mail_qhh',
      'direct_mail_quotes',
      'direct_mail_items',
      'call_in_qhh',
      'call_in_quotes',
      'call_in_items',
      'walk_in_qhh',
      'walk_in_quotes',
      'walk_in_items',
      'cross_sell_qhh',
      'cross_sell_quotes',
      'cross_sell_items',
      'referral_qhh',
      'referral_quotes',
      'referral_items',
      'other_qhh',
      'other_quotes',
      'other_items'
    ]

    const csv = headers.join(',') + '\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'daily_entry_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>CSV Upload</span>
          </CardTitle>
          <CardDescription>
            Upload a CSV file with daily entry data for bulk import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download Template</span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="strict-mode"
                checked={strictMode}
                onCheckedChange={setStrictMode}
              />
              <Label htmlFor="strict-mode" className="text-sm">
                Strict Mode
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              ref={fileInputRef}
            />
          </div>

          {file && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              onClick={handleValidate}
              disabled={!file || loading}
              variant="outline"
            >
              {loading ? 'Validating...' : 'Validate'}
            </Button>
            
            {validationResult?.isValid && (
              <Button
                onClick={handleImport}
                disabled={loading || importComplete}
              >
                {loading ? 'Importing...' : importComplete ? 'Imported' : 'Import'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {validationResult.isValid ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              <span>Validation Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4">
              <Badge variant={validationResult.isValid ? 'default' : 'destructive'}>
                {validationResult.isValid ? 'Valid' : 'Invalid'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {validationResult.processedRows.length} rows processed
              </span>
            </div>

            {validationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">{validationResult.errors.length} errors found:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {validationResult.errors.slice(0, 10).map((error, i) => (
                        <li key={i} className="text-xs">{error}</li>
                      ))}
                      {validationResult.errors.length > 10 && (
                        <li className="text-xs">...and {validationResult.errors.length - 10} more</li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validationResult.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">{validationResult.warnings.length} warnings:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {validationResult.warnings.map((warning, i) => (
                        <li key={i} className="text-xs">{warning}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
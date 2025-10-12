import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Upload, FileText, CheckCircle, AlertTriangle, Download } from 'lucide-react'
import { useSourcesForSelection, type Source } from '@/hooks/useSourcesForSelection'

// Source interface now imported from hook

interface Producer {
  id: string
  email: string
  display_name: string
  active: boolean
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  processedRows: any[]
}

export const CSVImporter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [importComplete, setImportComplete] = useState(false)
  const [producers, setProducers] = useState<Producer[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load all sources (including inactive) with proper sorting
  const { data: sources = [], isLoading: sourcesLoading } = useSourcesForSelection()

  // Load producers on mount
  useEffect(() => {
    loadProducers()
  }, [])

  const loadProducers = async () => {
    const { data } = await supabase
      .from('producers')
      .select('*')
    if (data) setProducers(data)
  }

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

  // Enhanced CSV parser with proper quote handling
  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = []

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue
      
      // Simple CSV parsing - can be enhanced for complex quoting
      const values = lines[i].split(',')
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim().replace(/"/g, '') || ''
      })
      
      rows.push(row)
    }

    return rows
  }

  // Detect CSV format (App vs JotForm)
  const detectCSVFormat = (headers: string[]): 'app' | 'jotform' => {
    const jotformHeaders = ['NAME', 'TODAYS DATE', 'OUTBOUND DIALS', 'TOTAL TALK TIME']
    return jotformHeaders.some(h => headers.includes(h)) ? 'jotform' : 'app'
  }

  // Convert JotForm format to App format
  const convertJotFormRow = (row: any): any => {
    const converted: any = {}
    
    // Map JotForm fields to App fields
    if (row['NAME']) {
      // Convert name to email format (firstname.lastname@temp.com)
      const name = row['NAME'].toLowerCase().replace(/\s+/g, '.')
      converted.producer_email = `${name}@temp.com`
      converted.producer_name = row['NAME']
    }
    
    if (row['TODAYS DATE']) {
      // Convert MM/DD/YYYY to YYYY-MM-DD
      const dateParts = row['TODAYS DATE'].split('/')
      if (dateParts.length === 3) {
        converted.entry_date = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`
      }
    }
    
    if (row['OUTBOUND DIALS: ___ / 100']) {
      const match = row['OUTBOUND DIALS: ___ / 100'].match(/(\d+)/)
      converted.outbound_dials = match ? parseInt(match[1]) : 0
    }
    
    if (row['TOTAL TALK TIME: ___ / 180 MINS']) {
      const match = row['TOTAL TALK TIME: ___ / 180 MINS'].match(/(\d+)/)
      converted.talk_minutes = match ? parseInt(match[1]) : 0
    }
    
    if (row['How many ITEMS did you SELL today?']) {
      converted.items_total = parseInt(row['How many ITEMS did you SELL today?'] || '0')
    }
    
    // Map source columns (LS - X for QHH, QT - X for Quotes)
    Object.keys(row).forEach(key => {
      if (key.startsWith('LS - ')) {
        const sourceName = key.replace('LS - ', '')
        const slug = sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
        converted[`${slug}_qhh`] = parseInt(row[key] || '0')
      }
      if (key.startsWith('QT - ')) {
        const sourceName = key.replace('QT - ', '')
        const slug = sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
        converted[`${slug}_quotes`] = parseInt(row[key] || '0')
      }
    })
    
    return converted
  }

  // Canonicalize source name (preserve historical names, create if needed)
  const canonicalizeSource = async (sourceName: string): Promise<string> => {
    const trimmed = sourceName.trim()
    if (!trimmed) return 'Other'
    
    // Case-insensitive lookup in existing sources
    const existing = sources.find(s => s.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing.name
    
    // Create new source if it doesn't exist
    try {
      const { data, error } = await supabase
        .from('sources')
        .insert({
          name: trimmed,
          active: true,
          sort_order: sources.length + 1
        })
        .select()
        .single()
      
      if (!error && data) {
        // Note: Sources will be refreshed by the hook automatically
        return data.name
      }
    } catch (error) {
      console.warn('Failed to create source:', trimmed, error)
    }
    
    return 'Other'
  }

  // Auto-create missing producer
  const createProducerFromName = async (name: string, email: string): Promise<Producer | null> => {
    try {
      const { data, error } = await supabase
        .from('producers')
        .insert({
          email,
          display_name: name,
          active: false // Historical producers are inactive
        })
        .select()
        .single()
      
      if (!error && data) {
        setProducers(prev => [...prev, data])
        return data
      }
    } catch (error) {
      console.error('Failed to create producer:', name, error)
    }
    
    return null
  }

  const validateData = async (rows: any[]): Promise<ValidationResult> => {
    const errors: string[] = []
    const warnings: string[] = []
    const processedRows: any[] = []
    
    if (rows.length === 0) {
      errors.push('No data rows found in CSV')
      return { isValid: false, errors, warnings, processedRows }
    }

    // Detect format
    const headers = Object.keys(rows[0])
    const format = detectCSVFormat(headers)
    
    warnings.push(`Detected ${format === 'jotform' ? 'JotForm RAW' : 'App Template'} format`)

    // Create producer map (case-insensitive emails)
    const producerMap = new Map(producers.map(p => [p.email.toLowerCase(), p]))

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i]
      const rowNum = i + 2 // Account for header row

      try {
        // Convert JotForm to App format if needed
        const row = format === 'jotform' ? convertJotFormRow(rawRow) : rawRow

        // Required fields validation
        if (!row.producer_email) {
          errors.push(`Row ${rowNum}: Missing producer identifier`)
          continue
        }

        if (!row.entry_date) {
          errors.push(`Row ${rowNum}: Missing entry_date`)
          continue
        }

        // Producer validation and auto-creation
        let producer = producerMap.get(row.producer_email.toLowerCase())
        if (!producer && row.producer_name) {
          // Auto-create missing producer for historical data
          producer = await createProducerFromName(row.producer_name, row.producer_email)
          if (producer) {
            producerMap.set(producer.email.toLowerCase(), producer)
            warnings.push(`Row ${rowNum}: Auto-created inactive producer ${producer.display_name}`)
          }
        }
        
        if (!producer) {
          errors.push(`Row ${rowNum}: Unknown producer ${row.producer_email} and no name provided for auto-creation`)
          continue
        }

        // Date validation (no restrictions - allow any date)
        const entryDate = new Date(row.entry_date)
        if (isNaN(entryDate.getTime())) {
          errors.push(`Row ${rowNum}: Invalid date format`)
          continue
        }

        // Numeric field validation
        const outboundDials = parseInt(row.outbound_dials || '0')
        const talkMinutes = parseInt(row.talk_minutes || '0')
        const itemsTotal = parseInt(row.items_total || '0')

        if (outboundDials < 0 || talkMinutes < 0 || itemsTotal < 0) {
          errors.push(`Row ${rowNum}: All numeric values must be non-negative`)
          continue
        }

        // Build source data and validate totals
        const bySourceData: any[] = []
        let sourceItemsSum = 0
        let sourceQHHSum = 0

        // Process source columns dynamically
        const sourceColumns = Object.keys(row).filter(key => 
          key.includes('_qhh') || key.includes('_quotes') || key.includes('_items')
        )
        
        const sourceGroups = new Map<string, any>()
        
        for (const col of sourceColumns) {
          const match = col.match(/^(.+)_(qhh|quotes|items)$/)
          if (match) {
            const sourceName = match[1].replace(/_/g, ' ')
            const metric = match[2]
            const value = parseInt(row[col] || '0')
            
            if (value < 0) {
              errors.push(`Row ${rowNum}: Source ${sourceName} ${metric} must be non-negative`)
              continue
            }
            
            if (!sourceGroups.has(sourceName)) {
              sourceGroups.set(sourceName, { qhh: 0, quotes: 0, items: 0 })
            }
            sourceGroups.get(sourceName)[metric] = value
          }
        }

        // Convert to final format and validate
        for (const [sourceName, metrics] of sourceGroups) {
          const canonicalName = await canonicalizeSource(sourceName)
          const source = sources.find(s => s.name === canonicalName)
          
          if (!source) {
            errors.push(`Row ${rowNum}: Could not resolve source ${sourceName}`)
            continue
          }
          
          bySourceData.push({
            source_id: source.id,
            qhh: metrics.qhh,
            quotes: metrics.quotes,
            items: metrics.items
          })
          
          sourceItemsSum += metrics.items
          sourceQHHSum += metrics.qhh
        }

        // Items total validation
        if (itemsTotal !== sourceItemsSum) {
          errors.push(`Row ${rowNum}: Items total (${itemsTotal}) must equal sum of items by source (${sourceItemsSum})`)
          continue
        }

        processedRows.push({
          producer_email: producer.email,
          entry_date: row.entry_date,
          outbound_dials: outboundDials,
          talk_minutes: talkMinutes,
          items_total: itemsTotal,
          qhh_total: sourceQHHSum,
          by_source: bySourceData
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
          description: `${result.processedRows.length} rows ready for import${result.warnings.length > 0 ? ` (${result.warnings.length} warnings)` : ''}`
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

  // Dynamic template generation based on all sources
  const downloadTemplate = () => {
    const baseHeaders = [
      'producer_email',
      'entry_date',
      'outbound_dials', 
      'talk_minutes',
      'items_total'
    ]
    
    // Add source-specific columns dynamically for ALL sources (including inactive)
    const sourceHeaders: string[] = []
    sources.forEach(source => {
      const slug = source.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
      sourceHeaders.push(`${slug}_qhh`)
      sourceHeaders.push(`${slug}_quotes`)
      sourceHeaders.push(`${slug}_items`)
    })
    
    const allHeaders = [...baseHeaders, ...sourceHeaders]
    const csv = allHeaders.join(',') + '\n'
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
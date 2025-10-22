import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { getDefaultEntryDate, isPast6PM } from '@/lib/timezone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Calendar, Lock, Save } from 'lucide-react'
import { useSourcesForSelection, type Source } from '@/hooks/useSourcesForSelection'
import { QuotedHouseholdForm, type QuotedHousehold } from './QuotedHouseholdForm'
import { SaleFromOldQuoteForm, type SaleFromOldQuote } from './SaleFromOldQuoteForm'

const STORAGE_KEY = 'dailyEntryFormData'

interface DailyEntryFormProps {
  producerId: string
  existingEntry?: any
  onSubmitted: () => void
}

export const DailyEntryForm: React.FC<DailyEntryFormProps> = ({
  producerId,
  existingEntry,
  onSubmitted
}) => {
  const [loading, setLoading] = useState(false)
  const [entryDate, setEntryDate] = useState(getDefaultEntryDate())
  const [outboundDials, setOutboundDials] = useState(0)
  const [talkMinutes, setTalkMinutes] = useState(0)
  const [qhhTotal, setQhhTotal] = useState(0)
  const [itemsSold, setItemsSold] = useState(0)
  const [salesMade, setSalesMade] = useState(0)
  const [validationError, setValidationError] = useState('')
  const [quotedHouseholds, setQuotedHouseholds] = useState<QuotedHousehold[]>([])
  const [salesFromOldQuotes, setSalesFromOldQuotes] = useState<SaleFromOldQuote[]>([])

  // Load all sources (including inactive) with proper "Other" sorting
  const { data: sources = [], isLoading: sourcesLoading } = useSourcesForSelection()

  // Load from sessionStorage on mount (only for new entries)
  useEffect(() => {
    if (!existingEntry) {
      try {
        const savedData = sessionStorage.getItem(STORAGE_KEY)
        if (savedData) {
          const parsed = JSON.parse(savedData)
          
          if (parsed.outboundDials !== undefined) setOutboundDials(parsed.outboundDials)
          if (parsed.talkMinutes !== undefined) setTalkMinutes(parsed.talkMinutes)
          if (parsed.qhhTotal !== undefined) setQhhTotal(parsed.qhhTotal)
          if (parsed.itemsSold !== undefined) setItemsSold(parsed.itemsSold)
          if (parsed.salesMade !== undefined) setSalesMade(parsed.salesMade)
          if (parsed.entryDate) setEntryDate(parsed.entryDate)
          if (parsed.quotedHouseholds) setQuotedHouseholds(parsed.quotedHouseholds)
          if (parsed.salesFromOldQuotes) setSalesFromOldQuotes(parsed.salesFromOldQuotes)
        }
      } catch (error) {
        console.error('Failed to load form data from sessionStorage:', error)
      }
    }
  }, [existingEntry])

  // Save to sessionStorage when values change (only for new entries)
  useEffect(() => {
    if (!existingEntry) {
      try {
        const formData = {
          outboundDials,
          talkMinutes,
          qhhTotal,
          itemsSold,
          salesMade,
          entryDate,
          quotedHouseholds,
          salesFromOldQuotes,
          timestamp: new Date().toISOString()
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
      } catch (error) {
        console.error('Failed to save form data to sessionStorage:', error)
      }
    }
  }, [outboundDials, talkMinutes, qhhTotal, itemsSold, salesMade, entryDate, quotedHouseholds, salesFromOldQuotes, existingEntry])

  // Save current form state to sessionStorage (for event listeners)
  const saveToSessionStorage = useCallback(() => {
    if (!existingEntry) {
      try {
        const formData = {
          outboundDials,
          talkMinutes,
          qhhTotal,
          itemsSold,
          salesMade,
          entryDate,
          quotedHouseholds,
          salesFromOldQuotes,
          timestamp: new Date().toISOString()
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
      } catch (error) {
        console.error('Failed to save form data to sessionStorage:', error)
      }
    }
  }, [outboundDials, talkMinutes, qhhTotal, itemsSold, salesMade, entryDate, quotedHouseholds, salesFromOldQuotes, existingEntry])

  // Add event listeners to save on window blur, visibility change, and before unload
  useEffect(() => {
    const handleWindowBlur = () => {
      saveToSessionStorage()
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveToSessionStorage()
      }
    }

    const handleBeforeUnload = () => {
      saveToSessionStorage()
    }

    // Attach event listeners
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup
    return () => {
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [saveToSessionStorage])

  useEffect(() => {
    if (existingEntry) {
      // Clear any saved draft when editing an existing entry
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch (error) {
        console.error('Failed to clear sessionStorage:', error)
      }

      setEntryDate(existingEntry.entry_date)
      setOutboundDials(existingEntry.outbound_dials || 0)
      setTalkMinutes(existingEntry.talk_minutes || 0)
      setQhhTotal(existingEntry.qhh_total || 0)
      setItemsSold(existingEntry.items_total || 0)
      setSalesMade(existingEntry.sales_total || 0)

      // Load existing quoted households
      const loadQuotedHouseholds = async () => {
        const { data: qhhData } = await (supabase as any)
          .from('quoted_households')
          .select('*')
          .eq('daily_entry_id', existingEntry.id)
        
        if (qhhData) {
          setQuotedHouseholds(qhhData as QuotedHousehold[])
        }
      }
      loadQuotedHouseholds()

      // Load existing sales from old quotes
      const loadSalesFromOldQuotes = async () => {
        const { data: salesData } = await (supabase as any)
          .from('sales_from_old_quotes')
          .select('*')
          .eq('daily_entry_id', existingEntry.id)
        
        if (salesData) {
          setSalesFromOldQuotes(salesData as SaleFromOldQuote[])
        }
      }
      loadSalesFromOldQuotes()
    }
  }, [existingEntry])


  const validateForm = () => {
    if (outboundDials < 0 || talkMinutes < 0 || qhhTotal < 0 || itemsSold < 0 || salesMade < 0) {
      setValidationError('All values must be non-negative')
      return false
    }

    const today = new Date().toISOString().split('T')[0]
    if (entryDate > today) {
      setValidationError('Entry date cannot be in the future')
      return false
    }

    // Validate QHH entries match QHH total
    if (quotedHouseholds.length !== qhhTotal) {
      setValidationError(`Number of QHH entries (${quotedHouseholds.length}) must match QHH total (${qhhTotal})`)
      return false
    }


    setValidationError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      // Get current authenticated user ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }
      // Save/update daily entry
      const entryData = {
        producer_id: producerId,
        entry_date: entryDate,
        entry_month: entryDate.substring(0, 7), // YYYY-MM format
        outbound_dials: outboundDials,
        talk_minutes: talkMinutes,
        qhh_total: qhhTotal,
        items_total: itemsSold,
        sales_total: salesMade
      }

      let entryId = existingEntry?.id

      if (existingEntry) {
        const { error } = await supabase
          .from('daily_entries')
          .update(entryData)
          .eq('id', existingEntry.id)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('daily_entries')
          .insert(entryData)
          .select()
          .single()

        if (error) throw error
        entryId = data.id
      }


      // Save quoted households
      if (quotedHouseholds.length > 0) {
        // Delete existing QHH entries if editing
        if (existingEntry) {
          await (supabase as any)
            .from('quoted_households')
            .delete()
            .eq('daily_entry_id', entryId)
        }

        // Insert new QHH entries
        const qhhEntries = quotedHouseholds.map(qhh => ({
          daily_entry_id: entryId,
          zip_code: qhh.zip_code,
          product_lines: qhh.product_lines,
          // lines_quoted and is_bundle are auto-generated by database trigger
          quoted_premium: qhh.quoted_premium,
          lead_source_id: qhh.lead_source_id,
          current_carrier: qhh.current_carrier || null,
          lead_id: qhh.lead_id || null,
          qcn: qhh.qcn || null,
          notes: qhh.notes || null,
          quick_action_status: qhh.quick_action_status,
          opted_into_hearsay: qhh.opted_into_hearsay,
          items_sold: qhh.items_sold || null,
          created_by: user.id
        }))

        const { error: qhhError } = await (supabase as any)
          .from('quoted_households')
          .insert(qhhEntries)

        if (qhhError) throw qhhError
      }

      // Save sales from old quotes using UPSERT pattern
      if (salesFromOldQuotes.length > 0) {
        // First, get existing sales to determine what to delete
        const { data: existingSales } = await (supabase as any)
          .from('sales_from_old_quotes')
          .select('id')
          .eq('daily_entry_id', entryId)

        const existingIds = existingSales?.map((s: any) => s.id) || []
        const currentIds = salesFromOldQuotes.filter(s => s.id).map(s => s.id!)

        // Delete removed sales
        const idsToDelete = existingIds.filter((id: string) => !currentIds.includes(id))
        if (idsToDelete.length > 0) {
          await (supabase as any)
            .from('sales_from_old_quotes')
            .delete()
            .in('id', idsToDelete)
        }

        // Upsert all sales (insert new, update existing)
        const salesEntries = salesFromOldQuotes.map(sale => ({
          ...(sale.id && { id: sale.id }), // Include id if editing
          daily_entry_id: entryId,
          lead_source_id: sale.lead_source_id,
          items_sold: sale.items_sold,
          premium: sale.premium,
          notes: sale.notes || null,
          created_by: user.id
        }))

        const { error: salesError } = await (supabase as any)
          .from('sales_from_old_quotes')
          .upsert(salesEntries, {
            onConflict: 'id'
          })

        if (salesError) throw salesError
      } else if (existingEntry) {
        // If no sales in form but entry exists, delete all sales
        await (supabase as any)
          .from('sales_from_old_quotes')
          .delete()
          .eq('daily_entry_id', entryId)
      }

      toast({
        title: "Success",
        description: "Daily entry saved successfully"
      })

      // Clear sessionStorage after successful save
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch (error) {
        console.error('Failed to clear sessionStorage:', error)
      }

      onSubmitted()
      
    } catch (error: any) {
      console.error('Error saving entry:', error)
      
      // Check for RLS violations specifically
      if (error.message?.includes('row-level security policy')) {
        toast({
          title: "Permission Error",
          description: "Unable to save entry. Please contact support if this persists.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to save entry",
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const isLocked = existingEntry && isPast6PM(entryDate)
  const canEdit = !isLocked // For now, assuming manager override will be handled elsewhere


  // QHH handlers
  const handleAddQHH = (qhh: QuotedHousehold) => {
    setQuotedHouseholds(prev => [...prev, qhh])
  }

  const handleEditQHH = (index: number, qhh: QuotedHousehold) => {
    setQuotedHouseholds(prev => prev.map((item, i) => i === index ? qhh : item))
  }

  const handleDeleteQHH = (index: number) => {
    setQuotedHouseholds(prev => prev.filter((_, i) => i !== index))
  }

  // Sales from old quotes handlers
  const handleAddSaleFromOldQuote = (sale: SaleFromOldQuote) => {
    setSalesFromOldQuotes(prev => [...prev, sale])
  }

  const handleEditSaleFromOldQuote = (index: number, sale: SaleFromOldQuote) => {
    setSalesFromOldQuotes(prev => prev.map((item, i) => i === index ? sale : item))
  }

  const handleDeleteSaleFromOldQuote = (index: number) => {
    setSalesFromOldQuotes(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Daily Entry</span>
            </CardTitle>
            <CardDescription>
              Enter your daily metrics and activity data
            </CardDescription>
          </div>
          {isLocked && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Lock className="h-3 w-3" />
              <span>Locked</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {validationError && (
            <Alert variant="destructive">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Entry Date */}
          <div className="space-y-2">
            <Label htmlFor="entry-date">Entry Date</Label>
            <Input
              id="entry-date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              disabled={!canEdit}
              required
            />
          </div>

          {/* Daily Totals */}
          <div className="form-section">
            <h3 className="text-lg font-semibold mb-4">Daily Totals</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="outbound-dials">Outbound Dials</Label>
                <Input
                  id="outbound-dials"
                  type="number"
                  min="0"
                  value={outboundDials}
                  onChange={(e) => setOutboundDials(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="talk-minutes">Talk Minutes</Label>
                <Input
                  id="talk-minutes"
                  type="number"
                  min="0"
                  value={talkMinutes}
                  onChange={(e) => setTalkMinutes(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qhh-total">QHH Total</Label>
                <Input
                  id="qhh-total"
                  type="number"
                  min="0"
                  value={qhhTotal}
                  onChange={(e) => setQhhTotal(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="items-sold">Items Sold</Label>
                <Input
                  id="items-sold"
                  type="number"
                  min="0"
                  value={itemsSold}
                  onChange={(e) => setItemsSold(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  disabled={!canEdit}
                />
              </div>
              
              {/* Items Breakdown - shows calculation for framework */}
              {(quotedHouseholds.length > 0 || salesFromOldQuotes.length > 0) && (
                <div className="col-span-full">
                  <div className="text-sm bg-muted/50 p-3 rounded-md space-y-1">
                    <p className="font-medium">Items Breakdown for Framework:</p>
                    <ul className="list-disc list-inside pl-2 space-y-0.5">
                      <li>
                        From today's QHH entries: {
                          quotedHouseholds
                            .filter(q => q.quick_action_status === 'SOLD')
                            .reduce((sum, q) => sum + (q.items_sold || 0), 0)
                        } items
                      </li>
                      <li>
                        From old quotes closing today: {
                          salesFromOldQuotes.reduce((sum, s) => sum + s.items_sold, 0)
                        } items
                      </li>
                      <li className="font-medium text-primary">
                        Total calculated for framework: {
                          quotedHouseholds
                            .filter(q => q.quick_action_status === 'SOLD')
                            .reduce((sum, q) => sum + (q.items_sold || 0), 0) +
                          salesFromOldQuotes.reduce((sum, s) => sum + s.items_sold, 0)
                        } items
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      Note: Framework status uses calculated_items_total (both sources combined)
                    </p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="sales-made">Policies Sold</Label>
                <Input
                  id="sales-made"
                  type="number"
                  min="0"
                  value={salesMade}
                  onChange={(e) => setSalesMade(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>


          {/* Quoted Households Section */}
          {qhhTotal > 0 && (
            <QuotedHouseholdForm
              quotedHouseholds={quotedHouseholds}
              onAdd={handleAddQHH}
              onEdit={handleEditQHH}
              onDelete={handleDeleteQHH}
              sources={sources}
              totalQHH={qhhTotal}
              canEdit={canEdit}
            />
          )}

          {/* Sales from Old Quotes Section */}
          <SaleFromOldQuoteForm
            salesFromOldQuotes={salesFromOldQuotes}
            onAdd={handleAddSaleFromOldQuote}
            onEdit={handleEditSaleFromOldQuote}
            onDelete={handleDeleteSaleFromOldQuote}
            sources={sources}
            canEdit={canEdit}
          />


          {canEdit && (
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Entry'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
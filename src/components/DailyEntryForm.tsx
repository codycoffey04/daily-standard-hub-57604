import React, { useState, useEffect } from 'react'
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
  const [sources, setSources] = useState<any[]>([])
  const [entryDate, setEntryDate] = useState(getDefaultEntryDate())
  const [outboundDials, setOutboundDials] = useState(0)
  const [talkMinutes, setTalkMinutes] = useState(0)
  const [itemsTotal, setItemsTotal] = useState(0)
  const [salesTotal, setSalesTotal] = useState(0)
  const [sourceData, setSourceData] = useState<Record<string, { qhh: number; quotes: number; items: number }>>({})
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    loadSources()
  }, [])

  useEffect(() => {
    if (existingEntry) {
      setEntryDate(existingEntry.entry_date)
      setOutboundDials(existingEntry.outbound_dials || 0)
      setTalkMinutes(existingEntry.talk_minutes || 0)
      setItemsTotal(existingEntry.items_total || 0)
      setSalesTotal(existingEntry.sales_total || 0)
      
      // Build source data from existing entry
      const data: Record<string, { qhh: number; quotes: number; items: number }> = {}
      existingEntry.daily_entry_sources?.forEach((des: any) => {
        data[des.source_id] = {
          qhh: des.qhh || 0,
          quotes: des.quotes || 0,
          items: des.items || 0
        }
      })
      setSourceData(data)
    }
  }, [existingEntry])

  const loadSources = async () => {
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .eq('active', true)
        .order('sort_order')

      if (error) {
        console.error('Error loading sources:', error)
        return
      }

      setSources(data || [])
      
      // Initialize source data if not already set
      const initialData: Record<string, { qhh: number; quotes: number; items: number }> = {}
      data?.forEach(source => {
        if (!sourceData[source.id]) {
          initialData[source.id] = { qhh: 0, quotes: 0, items: 0 }
        }
      })
      if (Object.keys(initialData).length > 0) {
        setSourceData(prev => ({ ...prev, ...initialData }))
      }
    } catch (error) {
      console.error('Error loading sources:', error)
    }
  }

  const updateSourceData = (sourceId: string, field: 'qhh' | 'quotes' | 'items', value: number) => {
    setSourceData(prev => ({
      ...prev,
      [sourceId]: {
        ...prev[sourceId],
        [field]: Math.max(0, value)
      }
    }))
  }

  // Auto-calculate items total from source breakdown
  useEffect(() => {
    const calculatedTotal = Object.values(sourceData).reduce((sum, data) => sum + (data.items || 0), 0)
    setItemsTotal(calculatedTotal)
  }, [sourceData])

  const validateForm = () => {
    const calculatedItemsTotal = Object.values(sourceData).reduce((sum, data) => sum + (data.items || 0), 0)
    
    if (itemsTotal !== calculatedItemsTotal) {
      setValidationError(`Items total (${itemsTotal}) must equal sum of items by source (${calculatedItemsTotal})`)
      return false
    }

    if (outboundDials < 0 || talkMinutes < 0 || itemsTotal < 0) {
      setValidationError('All values must be non-negative')
      return false
    }

    const today = new Date().toISOString().split('T')[0]
    if (entryDate > today) {
      setValidationError('Entry date cannot be in the future')
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
      // Save/update daily entry
      const entryData = {
        producer_id: producerId,
        entry_date: entryDate,
        entry_month: entryDate.substring(0, 7), // YYYY-MM format
        outbound_dials: outboundDials,
        talk_minutes: talkMinutes,
        items_total: itemsTotal
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

      // Update source data
      if (existingEntry) {
        // Delete existing source entries
        await supabase
          .from('daily_entry_sources')
          .delete()
          .eq('daily_entry_id', entryId)
      }

      // Insert new source entries
      const sourceEntries = sources.map(source => ({
        daily_entry_id: entryId,
        source_id: source.id,
        qhh: sourceData[source.id]?.qhh || 0,
        quotes: sourceData[source.id]?.quotes || 0,
        items: sourceData[source.id]?.items || 0
      }))

      const { error: sourceError } = await supabase
        .from('daily_entry_sources')
        .insert(sourceEntries)

      if (sourceError) throw sourceError

      toast({
        title: "Success",
        description: "Daily entry saved successfully"
      })

      onSubmitted()
      
    } catch (error: any) {
      console.error('Error saving entry:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save entry",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const isLocked = isPast6PM(entryDate)
  const canEdit = !isLocked // For now, assuming manager override will be handled elsewhere

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

          {/* Effort Metrics */}
          <div className="form-section">
            <h3 className="text-lg font-semibold mb-4">Effort Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="outbound-dials">Outbound Dials</Label>
                <Input
                  id="outbound-dials"
                  type="number"
                  min="0"
                  value={outboundDials}
                  onChange={(e) => setOutboundDials(parseInt(e.target.value) || 0)}
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
                  disabled={!canEdit}
                />
              </div>
            </div>
          </div>

          {/* Source Breakdown */}
          <div className="form-section">
            <h3 className="text-lg font-semibold mb-4">By Source</h3>
            <div className="space-y-4">
              {sources.map(source => (
                <div key={source.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div className="font-medium text-sm flex items-center">
                    {source.name}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">QHH</Label>
                    <Input
                      type="number"
                      min="0"
                      value={sourceData[source.id]?.qhh || 0}
                      onChange={(e) => updateSourceData(source.id, 'qhh', parseInt(e.target.value) || 0)}
                      disabled={!canEdit}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Quotes</Label>
                    <Input
                      type="number"
                      min="0"
                      value={sourceData[source.id]?.quotes || 0}
                      onChange={(e) => updateSourceData(source.id, 'quotes', parseInt(e.target.value) || 0)}
                      disabled={!canEdit}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Items</Label>
                    <Input
                      type="number"
                      min="0"
                      value={sourceData[source.id]?.items || 0}
                      onChange={(e) => updateSourceData(source.id, 'items', parseInt(e.target.value) || 0)}
                      disabled={!canEdit}
                      className="h-8"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items Total (Auto-calculated) */}
          <div className="form-section">
            <div className="space-y-2">
              <Label htmlFor="items-total">Items Total (Auto-calculated)</Label>
              <Input
                id="items-total"
                type="number"
                value={itemsTotal}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                This field is automatically calculated from the sum of items by source
              </p>
            </div>
          </div>

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
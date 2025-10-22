import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Edit2, Plus, DollarSign } from 'lucide-react'
import { type Source } from '@/hooks/useSourcesForSelection'

const STORAGE_KEY = 'salesFromOldQuotesFormData'

export interface SaleFromOldQuote {
  id?: string
  lead_source_id: string
  items_sold: number
  premium: number
  notes?: string | null
}

interface SaleFromOldQuoteFormProps {
  salesFromOldQuotes: SaleFromOldQuote[]
  onAdd: (sale: SaleFromOldQuote) => void
  onEdit: (index: number, sale: SaleFromOldQuote) => void
  onDelete: (index: number) => void
  sources: Source[]
  canEdit: boolean
}

export const SaleFromOldQuoteForm: React.FC<SaleFromOldQuoteFormProps> = ({
  salesFromOldQuotes,
  onAdd,
  onEdit,
  onDelete,
  sources,
  canEdit
}) => {
  const [showForm, setShowForm] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState<SaleFromOldQuote>({
    lead_source_id: '',
    items_sold: 1,
    premium: 0,
    notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load from sessionStorage on mount (only for new sales)
  useEffect(() => {
    if (editingIndex === null && !showForm) {
      try {
        const savedData = sessionStorage.getItem(STORAGE_KEY)
        if (savedData) {
          const parsed = JSON.parse(savedData)
          if (parsed.lead_source_id) setFormData(prev => ({ ...prev, lead_source_id: parsed.lead_source_id }))
          if (parsed.items_sold !== undefined) setFormData(prev => ({ ...prev, items_sold: parsed.items_sold }))
          if (parsed.premium !== undefined) setFormData(prev => ({ ...prev, premium: parsed.premium }))
          if (parsed.notes) setFormData(prev => ({ ...prev, notes: parsed.notes }))
          
          if (canEdit) {
            setShowForm(true)
          }
        }
      } catch (error) {
        console.error('Failed to load sale from old quote form data from sessionStorage:', error)
      }
    }
  }, [editingIndex, showForm, canEdit])

  // Save to sessionStorage when formData changes
  useEffect(() => {
    if (editingIndex === null && showForm) {
      try {
        const dataToSave = {
          lead_source_id: formData.lead_source_id,
          items_sold: formData.items_sold,
          premium: formData.premium,
          notes: formData.notes,
          timestamp: new Date().toISOString()
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
      } catch (error) {
        console.error('Failed to save sale from old quote form data to sessionStorage:', error)
      }
    }
  }, [formData, editingIndex, showForm])

  // Save current form state to sessionStorage (for event listeners)
  const saveToSessionStorage = useCallback(() => {
    if (editingIndex === null && showForm) {
      try {
        const dataToSave = {
          lead_source_id: formData.lead_source_id,
          items_sold: formData.items_sold,
          premium: formData.premium,
          notes: formData.notes,
          timestamp: new Date().toISOString()
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
      } catch (error) {
        console.error('Failed to save sale from old quote form data to sessionStorage:', error)
      }
    }
  }, [formData, editingIndex, showForm])

  // Add event listeners to save on window blur, visibility change, and before unload
  useEffect(() => {
    if (!showForm || editingIndex !== null) {
      return
    }

    const handleWindowBlur = () => saveToSessionStorage()
    const handleVisibilityChange = () => {
      if (document.hidden) saveToSessionStorage()
    }
    const handleBeforeUnload = () => saveToSessionStorage()

    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [saveToSessionStorage, showForm, editingIndex])

  const resetForm = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear sessionStorage:', error)
    }
    
    setFormData({
      lead_source_id: '',
      items_sold: 1,
      premium: 0,
      notes: ''
    })
    setErrors({})
    setShowForm(false)
    setEditingIndex(null)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.lead_source_id) {
      newErrors.lead_source_id = 'Lead source is required'
    }
    
    if (!formData.items_sold || formData.items_sold < 1) {
      newErrors.items_sold = 'Items sold must be at least 1'
    }
    
    if (!formData.premium || formData.premium <= 0) {
      newErrors.premium = 'Premium must be greater than 0'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) return

    if (editingIndex !== null) {
      onEdit(editingIndex, formData)
    } else {
      onAdd(formData)
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch (error) {
        console.error('Failed to clear sessionStorage:', error)
      }
    }
    resetForm()
  }

  const startEdit = (index: number) => {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear sessionStorage:', error)
    }
    
    setFormData(salesFromOldQuotes[index])
    setEditingIndex(index)
    setShowForm(true)
  }

  // Calculate total items from all sales
  const totalItems = salesFromOldQuotes.reduce((sum, sale) => sum + sale.items_sold, 0)
  const totalPremium = salesFromOldQuotes.reduce((sum, sale) => sum + sale.premium, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Sales from Old Quotes ({salesFromOldQuotes.length})
          </h3>
          {salesFromOldQuotes.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {totalItems} items • ${totalPremium.toFixed(2)} premium
            </p>
          )}
        </div>
        {canEdit && !showForm && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Sale from Old Quote
          </Button>
        )}
      </div>

      {/* Sale Entry Form */}
      {showForm && canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingIndex !== null ? 'Edit' : 'Recording'} Sale from Previous Quote Date
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Record a sale that closed today from a quote generated on a previous date
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lead Source */}
                <div className="space-y-2">
                  <Label>Lead Source *</Label>
                  <Select 
                    value={formData.lead_source_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, lead_source_id: value }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {sources.map(source => (
                        <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.lead_source_id && <p className="text-sm text-destructive">{errors.lead_source_id}</p>}
                </div>

                {/* Items Sold */}
                <div className="space-y-2">
                  <Label htmlFor="old-items-sold">Items Sold *</Label>
                  <Input
                    id="old-items-sold"
                    type="number"
                    min={1}
                    value={formData.items_sold}
                    onChange={(e) => setFormData(prev => ({ ...prev, items_sold: parseInt(e.target.value) || 1 }))}
                    onFocus={(e) => e.target.select()}
                  />
                  {errors.items_sold && <p className="text-sm text-destructive">{errors.items_sold}</p>}
                </div>

                {/* Premium */}
                <div className="space-y-2">
                  <Label htmlFor="old-premium">Premium *</Label>
                  <Input
                    id="old-premium"
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={formData.premium}
                    onChange={(e) => setFormData(prev => ({ ...prev, premium: parseFloat(e.target.value) || 0 }))}
                    onFocus={(e) => e.target.select()}
                  />
                  {errors.premium && <p className="text-sm text-destructive">{errors.premium}</p>}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="old-notes">Notes (Optional)</Label>
                <Textarea
                  id="old-notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Policy number, original quote date, or other reference info..."
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Add context like policy number or when they were originally quoted
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="button" onClick={handleSubmit}>
                  {editingIndex !== null ? 'Update' : 'Add'} Sale
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List of Sales */}
      {salesFromOldQuotes.length > 0 && (
        <div className="space-y-2">
          {salesFromOldQuotes.map((sale, index) => {
            const source = sources.find(s => s.id === sale.lead_source_id)
            return (
              <Card key={index} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">{source?.name || 'Unknown Source'}</Badge>
                      <span className="text-sm font-medium">{sale.items_sold} items</span>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm flex items-center">
                        <DollarSign className="h-3 w-3" />
                        {sale.premium.toFixed(2)}
                      </span>
                    </div>
                    {sale.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{sale.notes}</p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(index)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

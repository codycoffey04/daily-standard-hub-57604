import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Edit2, Save, Plus } from 'lucide-react'
import { type Source } from '@/hooks/useSourcesForSelection'

export interface QuotedHousehold {
  id?: string
  full_name: string
  phone_number: string
  policies_quoted: number
  lead_source_id: string
  notes: string
  quick_action_status: string
  opted_into_hearsay: boolean
  items_sold?: number
}

const QUICK_ACTION_OPTIONS = [
  'Attempted Contact',
  'Bad Lead',
  'Not Interested – Recycle', 
  'Not Interested Now',
  'Quoted',
  'ReQuote/X-Date',
  'SOLD'
]

const POLICIES_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1)

const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 3) return cleaned
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
}

const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/
  return phoneRegex.test(phone)
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'SOLD': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'Quoted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case 'ReQuote/X-Date': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case 'Not Interested – Recycle': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    case 'Bad Lead': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }
}

interface QuotedHouseholdFormProps {
  quotedHouseholds: QuotedHousehold[]
  onAdd: (qhh: QuotedHousehold) => void
  onEdit: (index: number, qhh: QuotedHousehold) => void
  onDelete: (index: number) => void
  sources: Source[]
  totalQHH: number
  canEdit: boolean
}

export const QuotedHouseholdForm: React.FC<QuotedHouseholdFormProps> = ({
  quotedHouseholds,
  onAdd,
  onEdit,
  onDelete,
  sources,
  totalQHH,
  canEdit
}) => {
  const [showForm, setShowForm] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState<QuotedHousehold>({
    full_name: '',
    phone_number: '',
    policies_quoted: 1,
    lead_source_id: '',
    notes: '',
    quick_action_status: '',
    opted_into_hearsay: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone_number: '',
      policies_quoted: 1,
      lead_source_id: '',
      notes: '',
      quick_action_status: '',
      opted_into_hearsay: false,
      items_sold: undefined
    })
    setErrors({})
    setShowForm(false)
    setEditingIndex(null)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required'
    if (!formData.phone_number.trim()) newErrors.phone_number = 'Phone number is required'
    else if (!validatePhoneNumber(formData.phone_number)) {
      newErrors.phone_number = 'Phone number must be in format (XXX) XXX-XXXX'
    }
    if (!formData.lead_source_id) newErrors.lead_source_id = 'Lead source is required'
    if (!formData.quick_action_status) newErrors.quick_action_status = 'Quick action status is required'
    
    // Validate items_sold when status is SOLD
    if ((formData.quick_action_status ?? '').toUpperCase() === 'SOLD') {
      if (!formData.items_sold || formData.items_sold < 1) {
        newErrors.items_sold = 'Items sold is required for SOLD status'
      }
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
    }
    resetForm()
  }

  const startEdit = (index: number) => {
    setFormData(quotedHouseholds[index])
    setEditingIndex(index)
    setShowForm(true)
  }

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value)
    setFormData(prev => ({ ...prev, phone_number: formatted }))
  }

  return (
    <div className="form-section">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Quoted Households ({quotedHouseholds.length} of {totalQHH} entered)
        </h3>
        {canEdit && !showForm && (
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => setShowForm(true)}
            disabled={quotedHouseholds.length >= totalQHH}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add QHH
          </Button>
        )}
      </div>

      {/* QHH Entry Form */}
      {showForm && canEdit && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">
              {editingIndex !== null ? 'Edit' : 'Add'} Quoted Household
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name *</Label>
                  <Input
                    id="full-name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter full name"
                  />
                  {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone-number">Phone Number *</Label>
                  <Input
                    id="phone-number"
                    value={formData.phone_number}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(XXX) XXX-XXXX"
                    maxLength={14}
                  />
                  {errors.phone_number && <p className="text-sm text-destructive">{errors.phone_number}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Policies Quoted *</Label>
                  <Select 
                    value={formData.policies_quoted.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, policies_quoted: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POLICIES_OPTIONS.map(num => (
                        <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Lead Source *</Label>
                  <Select 
                    value={formData.lead_source_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, lead_source_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map(source => (
                        <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.lead_source_id && <p className="text-sm text-destructive">{errors.lead_source_id}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quick Action Status *</Label>
                <Select 
                  value={formData.quick_action_status} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, quick_action_status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUICK_ACTION_OPTIONS.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.quick_action_status && <p className="text-sm text-destructive">{errors.quick_action_status}</p>}
              </div>

              {/* Items Sold - Show only when status is SOLD */}
              {(formData.quick_action_status ?? '').toUpperCase() === 'SOLD' && (
                <div className="space-y-2">
                  <Label htmlFor="items_sold">Items Sold *</Label>
                  <Input
                    id="items_sold"
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={formData.items_sold ?? ''}
                    placeholder="Enter number of items sold"
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        items_sold: val === '' ? undefined : Math.max(1, Math.min(10, Number(val)))
                      }))
                    }}
                  />
                  {errors.items_sold && <p className="text-sm text-destructive">{errors.items_sold}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Specific Notes on Call</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter any specific notes about the call..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hearsay"
                  checked={formData.opted_into_hearsay}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, opted_into_hearsay: checked as boolean }))
                  }
                />
                <Label htmlFor="hearsay">Opted into Hearsay</Label>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button type="button" size="sm" onClick={handleSubmit}>
                  <Save className="h-4 w-4 mr-1" />
                  {editingIndex !== null ? 'Update' : 'Add'} QHH
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QHH List */}
      {quotedHouseholds.length > 0 && (
        <div className="space-y-3">
          {quotedHouseholds.map((qhh, index) => {
            const source = sources.find(s => s.id === qhh.lead_source_id)
            return (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium">{qhh.full_name}</h4>
                      <Badge className={getStatusColor(qhh.quick_action_status)}>
                        {qhh.quick_action_status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Phone:</span> {qhh.phone_number}
                      </div>
                      <div>
                        <span className="font-medium">Policies:</span> {qhh.policies_quoted}
                      </div>
                      <div>
                        <span className="font-medium">Source:</span> {source?.name || 'Unknown'}
                      </div>
                      {(qhh.quick_action_status ?? '').toUpperCase() === 'SOLD' && qhh.items_sold && (
                        <div>
                          <span className="font-medium">Items Sold:</span> {qhh.items_sold}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Hearsay:</span> {qhh.opted_into_hearsay ? 'Yes' : 'No'}
                      </div>
                    </div>
                    {qhh.notes && (
                      <div className="text-sm">
                        <span className="font-medium text-muted-foreground">Notes:</span> {qhh.notes}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex space-x-1 ml-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(index)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {totalQHH > 0 && quotedHouseholds.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No quoted households entered yet.</p>
          <p className="text-sm">You need to enter {totalQHH} QHH details to match your source totals.</p>
        </div>
      )}
    </div>
  )
}
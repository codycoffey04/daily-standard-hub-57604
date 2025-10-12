import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useSourceCosts, useCreateSourceCost, useUpdateSourceCost, useDeleteSourceCost, type SourceCost } from '@/hooks/useSourceCosts'
import { formatNumber } from '@/lib/utils'
import { ChartLoading } from '@/components/ui/chart-loading'
import { Pencil, Trash2, Plus, DollarSign, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface CostManagementModalProps {
  sourceId: string
  sourceName: string
  isOpen: boolean
  onClose: () => void
  currentFilterYear: number
  currentFilterMonth: number | null
}

export const CostManagementModal: React.FC<CostManagementModalProps> = ({
  sourceId,
  sourceName,
  isOpen,
  onClose,
  currentFilterYear,
  currentFilterMonth
}) => {
  const { profile } = useAuth()
  const canEdit = profile?.role === 'owner' || profile?.role === 'manager'
  
  const { data: costs, isLoading } = useSourceCosts(sourceId)
  const createCost = useCreateSourceCost()
  const updateCost = useUpdateSourceCost()
  const deleteCost = useDeleteSourceCost()
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCost, setEditingCost] = useState<SourceCost | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    month: '',
    cost: '',
    notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const resetForm = () => {
    setFormData({ month: '', cost: '', notes: '' })
    setErrors({})
    setIsFormOpen(false)
    setEditingCost(null)
  }
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    // Validate month (YYYY-MM format, not in future)
    if (!formData.month || !/^\d{4}-\d{2}$/.test(formData.month)) {
      newErrors.month = 'Valid month (YYYY-MM) is required'
    } else {
      const selectedMonth = new Date(formData.month + '-01')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedMonth > today) {
        newErrors.month = 'Month cannot be in the future'
      }
    }
    
    // Validate cost (must be >= 0)
    const costNum = parseFloat(formData.cost)
    if (isNaN(costNum) || costNum < 0) {
      newErrors.cost = 'Cost must be a valid number >= 0'
    }
    
    // Check for duplicate month (only on create, or if month changed on edit)
    const monthToCheck = formData.month + '-01'
    const isDuplicate = costs?.some(c => 
      c.month === monthToCheck && 
      (!editingCost || c.id !== editingCost.id)
    )
    if (isDuplicate) {
      newErrors.month = 'Cost entry already exists for this month'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = async () => {
    if (!validateForm()) return
    
    const input = {
      source_id: sourceId,
      month: formData.month + '-01', // Convert YYYY-MM to YYYY-MM-01
      cost: parseFloat(formData.cost),
      notes: formData.notes || null
    }
    
    if (editingCost) {
      await updateCost.mutateAsync({ id: editingCost.id, ...input })
    } else {
      await createCost.mutateAsync(input)
    }
    
    resetForm()
  }
  
  const startEdit = (cost: SourceCost) => {
    setFormData({
      month: cost.month.substring(0, 7), // Extract YYYY-MM
      cost: cost.cost.toString(),
      notes: cost.notes || ''
    })
    setEditingCost(cost)
    setIsFormOpen(true)
  }
  
  const handleDelete = async (id: string) => {
    await deleteCost.mutateAsync({ id, sourceId })
    setDeleteConfirmId(null)
  }
  
  // Calculate totals
  const totalAllTime = costs?.reduce((sum, c) => sum + c.cost, 0) || 0
  
  const totalFiltered = costs?.reduce((sum, c) => {
    const costDate = parseISO(c.month)
    const costYear = costDate.getFullYear()
    const costMonth = costDate.getMonth() + 1
    
    if (currentFilterMonth === null) {
      // Year only filter
      return costYear === currentFilterYear ? sum + c.cost : sum
    } else {
      // Year + month filter
      return (costYear === currentFilterYear && costMonth === currentFilterMonth) 
        ? sum + c.cost : sum
    }
  }, 0) || 0
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Manage Costs - {sourceName}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Summary Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Spend (All Time)</p>
                    <p className="text-2xl font-bold">${formatNumber(Math.round(totalAllTime))}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Spend (
                      {currentFilterMonth 
                        ? `${currentFilterYear}-${String(currentFilterMonth).padStart(2, '0')}`
                        : currentFilterYear
                      })
                    </p>
                    <p className="text-2xl font-bold">${formatNumber(Math.round(totalFiltered))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Add/Edit Form */}
            {isFormOpen && canEdit && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h3 className="font-medium">
                    {editingCost ? 'Edit Cost Entry' : 'Add New Cost Entry'}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cost-month">
                        Month (YYYY-MM) *
                      </Label>
                      <Input
                        id="cost-month"
                        type="month"
                        value={formData.month}
                        onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
                        max={format(new Date(), 'yyyy-MM')}
                      />
                      {errors.month && (
                        <p className="text-sm text-destructive">{errors.month}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cost-amount">
                        Cost ($) *
                      </Label>
                      <Input
                        id="cost-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost}
                        onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                        placeholder="0.00"
                      />
                      {errors.cost && (
                        <p className="text-sm text-destructive">{errors.cost}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cost-notes">Notes (Optional)</Label>
                    <Textarea
                      id="cost-notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add any notes about this cost..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button onClick={handleSubmit} disabled={createCost.isPending || updateCost.isPending}>
                      {editingCost ? 'Update' : 'Add'} Cost
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Costs Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Cost History</h3>
                {canEdit && !isFormOpen && (
                  <Button size="sm" onClick={() => setIsFormOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cost
                  </Button>
                )}
              </div>
              
              {isLoading ? (
                <ChartLoading />
              ) : costs && costs.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead>Notes</TableHead>
                        {canEdit && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costs.map((cost) => (
                        <TableRow key={cost.id}>
                          <TableCell>
                            {format(parseISO(cost.month), 'MMM yyyy')}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${formatNumber(Math.round(cost.cost))}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {cost.notes || '—'}
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(cost)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirmId(cost.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No cost data available</p>
                    {canEdit && (
                      <p className="text-sm mt-1">Click "Add Cost" to get started</p>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {!canEdit && costs && costs.length > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  Contact admin to update source costs
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cost Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this cost entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

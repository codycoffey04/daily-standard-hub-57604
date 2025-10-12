import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useSourceCosts, useCreateSourceCost, useUpdateSourceCost, useDeleteSourceCost, type SourceCost } from '@/hooks/useSourceCosts'
import { useUpdateSource, useCreateSource, useDeleteSource } from '@/hooks/useSources'
import { formatNumber } from '@/lib/utils'
import { ChartLoading } from '@/components/ui/chart-loading'
import { Pencil, Trash2, Plus, Calendar } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface Source {
  id: string | null
  name: string
  active: boolean
  sort_order: number
}

interface SourceEditModalProps {
  source: Source
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export const SourceEditModal: React.FC<SourceEditModalProps> = ({
  source,
  isOpen,
  onClose,
  onSaved
}) => {
  const { profile } = useAuth()
  const canEdit = profile?.role === 'owner' || profile?.role === 'manager'
  
  const isNewSource = source.id === null
  
  // Details tab state
  const [detailsForm, setDetailsForm] = useState({
    name: source.name,
    active: source.active,
    sort_order: source.sort_order
  })
  const [detailsErrors, setDetailsErrors] = useState<Record<string, string>>({})
  
  // Costs tab state
  const [isCostFormOpen, setIsCostFormOpen] = useState(false)
  const [editingCost, setEditingCost] = useState<SourceCost | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteSourceConfirm, setDeleteSourceConfirm] = useState(false)
  
  const [costForm, setCostForm] = useState({
    month: '',
    cost: '',
    notes: ''
  })
  const [costErrors, setCostErrors] = useState<Record<string, string>>({})
  
  // Mutations
  const updateSource = useUpdateSource()
  const createSource = useCreateSource()
  const deleteSource = useDeleteSource()
  
  const { data: costs, isLoading: costsLoading } = useSourceCosts(source.id || '')
  const createCost = useCreateSourceCost()
  const updateCost = useUpdateSourceCost()
  const deleteCost = useDeleteSourceCost()
  
  // Reset forms when source changes
  useEffect(() => {
    setDetailsForm({
      name: source.name,
      active: source.active,
      sort_order: source.sort_order
    })
    setDetailsErrors({})
  }, [source])
  
  const validateDetails = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!detailsForm.name.trim()) {
      errors.name = 'Name is required'
    } else if (detailsForm.name.length > 100) {
      errors.name = 'Name must be less than 100 characters'
    }
    
    if (detailsForm.sort_order < 0) {
      errors.sort_order = 'Sort order must be 0 or greater'
    }
    
    setDetailsErrors(errors)
    return Object.keys(errors).length === 0
  }
  
  const handleSaveDetails = async () => {
    if (!validateDetails()) return
    
    const input = {
      name: detailsForm.name.trim(),
      active: detailsForm.active,
      sort_order: detailsForm.sort_order
    }
    
    if (isNewSource) {
      await createSource.mutateAsync(input)
    } else {
      await updateSource.mutateAsync({ id: source.id!, ...input })
    }
    
    onSaved()
    onClose()
  }
  
  const handleDeleteSource = async () => {
    if (!source.id) return
    await deleteSource.mutateAsync(source.id)
    onSaved()
    onClose()
  }
  
  // Cost management functions
  const resetCostForm = () => {
    setCostForm({ month: '', cost: '', notes: '' })
    setCostErrors({})
    setIsCostFormOpen(false)
    setEditingCost(null)
  }
  
  const validateCostForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!costForm.month || !/^\d{4}-\d{2}$/.test(costForm.month)) {
      newErrors.month = 'Valid month (YYYY-MM) is required'
    } else {
      const selectedMonth = new Date(costForm.month + '-01')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedMonth > today) {
        newErrors.month = 'Month cannot be in the future'
      }
    }
    
    const costNum = parseFloat(costForm.cost)
    if (isNaN(costNum) || costNum < 0) {
      newErrors.cost = 'Cost must be a valid number >= 0'
    }
    
    const monthToCheck = costForm.month + '-01'
    const isDuplicate = costs?.some(c => 
      c.month === monthToCheck && 
      (!editingCost || c.id !== editingCost.id)
    )
    if (isDuplicate) {
      newErrors.month = 'Cost entry already exists for this month'
    }
    
    setCostErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmitCost = async () => {
    if (!validateCostForm() || !source.id) return
    
    const input = {
      source_id: source.id,
      month: costForm.month + '-01',
      cost: parseFloat(costForm.cost),
      notes: costForm.notes || null
    }
    
    if (editingCost) {
      await updateCost.mutateAsync({ id: editingCost.id, ...input })
    } else {
      await createCost.mutateAsync(input)
    }
    
    resetCostForm()
  }
  
  const startEditCost = (cost: SourceCost) => {
    setCostForm({
      month: cost.month.substring(0, 7),
      cost: cost.cost.toString(),
      notes: cost.notes || ''
    })
    setEditingCost(cost)
    setIsCostFormOpen(true)
  }
  
  const handleDeleteCost = async (id: string) => {
    if (!source.id) return
    await deleteCost.mutateAsync({ id, sourceId: source.id })
    setDeleteConfirmId(null)
  }
  
  const totalAllTime = costs?.reduce((sum, c) => sum + c.cost, 0) || 0
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isNewSource ? 'Add New Source' : `Edit Source - ${source.name}`}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="costs" disabled={isNewSource}>
                Monthly Costs
              </TabsTrigger>
            </TabsList>
            
            {/* DETAILS TAB */}
            <TabsContent value="details" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="source-name">Name *</Label>
                  <Input
                    id="source-name"
                    value={detailsForm.name}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!canEdit}
                    placeholder="e.g., Google Ads, Facebook, Referrals"
                  />
                  {detailsErrors.name && (
                    <p className="text-sm text-destructive">{detailsErrors.name}</p>
                  )}
                </div>
                
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="source-active">Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Active sources appear in dropdown menus
                    </p>
                  </div>
                  <Switch
                    id="source-active"
                    checked={detailsForm.active}
                    onCheckedChange={(checked) => setDetailsForm(prev => ({ ...prev, active: checked }))}
                    disabled={!canEdit}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="source-sort">Sort Order</Label>
                  <Input
                    id="source-sort"
                    type="number"
                    min="0"
                    value={detailsForm.sort_order}
                    onChange={(e) => setDetailsForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    disabled={!canEdit}
                  />
                  <p className="text-sm text-muted-foreground">
                    Lower numbers appear first in lists
                  </p>
                  {detailsErrors.sort_order && (
                    <p className="text-sm text-destructive">{detailsErrors.sort_order}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  {!isNewSource && canEdit && (
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteSourceConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Source
                    </Button>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  {canEdit && (
                    <Button 
                      onClick={handleSaveDetails}
                      disabled={updateSource.isPending || createSource.isPending}
                    >
                      {isNewSource ? 'Create Source' : 'Save Changes'}
                    </Button>
                  )}
                </div>
              </div>
              
              {!canEdit && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  Contact admin to manage sources
                </p>
              )}
            </TabsContent>
            
            {/* MONTHLY COSTS TAB */}
            <TabsContent value="costs" className="space-y-6">
              {/* Summary Section */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Spend (All Time)</p>
                    <p className="text-2xl font-bold">${formatNumber(Math.round(totalAllTime))}</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Add/Edit Form */}
              {isCostFormOpen && canEdit && (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="font-medium">
                      {editingCost ? 'Edit Cost Entry' : 'Add New Cost Entry'}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cost-month">Month (YYYY-MM) *</Label>
                        <Input
                          id="cost-month"
                          type="month"
                          value={costForm.month}
                          onChange={(e) => setCostForm(prev => ({ ...prev, month: e.target.value }))}
                          max={format(new Date(), 'yyyy-MM')}
                        />
                        {costErrors.month && (
                          <p className="text-sm text-destructive">{costErrors.month}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="cost-amount">Cost ($) *</Label>
                        <Input
                          id="cost-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={costForm.cost}
                          onChange={(e) => setCostForm(prev => ({ ...prev, cost: e.target.value }))}
                          placeholder="0.00"
                        />
                        {costErrors.cost && (
                          <p className="text-sm text-destructive">{costErrors.cost}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cost-notes">Notes (Optional)</Label>
                      <Textarea
                        id="cost-notes"
                        value={costForm.notes}
                        onChange={(e) => setCostForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add any notes about this cost..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        onClick={handleSubmitCost} 
                        disabled={createCost.isPending || updateCost.isPending}
                      >
                        {editingCost ? 'Update' : 'Add'} Cost
                      </Button>
                      <Button variant="outline" onClick={resetCostForm}>
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
                  {canEdit && !isCostFormOpen && (
                    <Button size="sm" onClick={() => setIsCostFormOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Cost
                    </Button>
                  )}
                </div>
                
                {costsLoading ? (
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
                                    onClick={() => startEditCost(cost)}
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
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Delete Cost Confirmation */}
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
              onClick={() => deleteConfirmId && handleDeleteCost(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Source Confirmation */}
      <AlertDialog open={deleteSourceConfirm} onOpenChange={setDeleteSourceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Source?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{source.name}" and all associated cost data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSource}
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

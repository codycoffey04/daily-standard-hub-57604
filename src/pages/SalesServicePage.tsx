import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { useSourcesForSelection } from '@/hooks/useSourcesForSelection'
import { QuotedHouseholdForm, type QuotedHousehold } from '@/components/QuotedHouseholdForm'
import { SaleFromOldQuoteForm, type SaleFromOldQuote } from '@/components/SaleFromOldQuoteForm'
import { Save } from 'lucide-react'

const SalesServicePage: React.FC = () => {
  const { user } = useAuth()
  const { data: sources = [] } = useSourcesForSelection()
  const [quotedHouseholds, setQuotedHouseholds] = useState<QuotedHousehold[]>([])
  const [salesFromOldQuotes, setSalesFromOldQuotes] = useState<SaleFromOldQuote[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')

  const canEdit = true

  const handleAddQHH = (qhh: QuotedHousehold) => {
    setQuotedHouseholds(prev => [...prev, qhh])
  }
  const handleEditQHH = (index: number, qhh: QuotedHousehold) => {
    setQuotedHouseholds(prev => prev.map((item, i) => (i === index ? qhh : item)))
  }
  const handleDeleteQHH = (index: number) => {
    setQuotedHouseholds(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddSale = (sale: SaleFromOldQuote) => {
    setSalesFromOldQuotes(prev => [...prev, sale])
  }
  const handleEditSale = (index: number, sale: SaleFromOldQuote) => {
    setSalesFromOldQuotes(prev => prev.map((item, i) => (i === index ? sale : item)))
  }
  const handleDeleteSale = (index: number) => {
    setSalesFromOldQuotes(prev => prev.filter((_, i) => i !== index))
  }

  const saveAll = async () => {
    setError('')
    if (!user) {
      setError('Not authenticated')
      return
    }
    setSaving(true)
    try {
      if (quotedHouseholds.length > 0) {
        const qhhInserts = quotedHouseholds.map(q => ({
          daily_entry_id: null,
          zip_code: q.zip_code,
          product_lines: q.product_lines,
          quoted_premium: q.quoted_premium,
          lead_source_id: q.lead_source_id,
          current_carrier: q.current_carrier || null,
          lead_id: q.lead_id || null,
          qcn: q.qcn || null,
          notes: q.notes || null,
          quick_action_status: q.quick_action_status,
          opted_into_hearsay: q.opted_into_hearsay,
          items_sold: q.items_sold || null,
          created_by: user.id
        }))
        const { error: qhhError } = await (supabase as any)
          .from('quoted_households')
          .insert(qhhInserts)
        if (qhhError) throw qhhError
      }

      if (salesFromOldQuotes.length > 0) {
        const salesInserts = salesFromOldQuotes.map(s => ({
          lead_source_id: s.lead_source_id,
          zip_code: s.zip_code,
          items_sold: s.items_sold,
          premium: s.premium,
          notes: s.notes || null,
          daily_entry_id: null,
          created_by: user.id
        }))
        const { error: salesError } = await (supabase as any)
          .from('sales_from_old_quotes')
          .insert(salesInserts)
        if (salesError) throw salesError
      }

      setQuotedHouseholds([])
      setSalesFromOldQuotes([])

      toast({ title: 'Saved', description: 'Entries recorded successfully.' })
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Failed to save entries')
      toast({ title: 'Error', description: 'Failed to save entries', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sales Service Logging</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <QuotedHouseholdForm
            quotedHouseholds={quotedHouseholds}
            onAdd={handleAddQHH}
            onEdit={handleEditQHH}
            onDelete={handleDeleteQHH}
            sources={sources}
            totalQHH={9999}
            canEdit={canEdit}
          />

          <SaleFromOldQuoteForm
            salesFromOldQuotes={salesFromOldQuotes}
            onAdd={handleAddSale}
            onEdit={handleEditSale}
            onDelete={handleDeleteSale}
            sources={sources}
            canEdit={canEdit}
          />

          <Button onClick={saveAll} disabled={saving || (!quotedHouseholds.length && !salesFromOldQuotes.length)} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Entries'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default SalesServicePage

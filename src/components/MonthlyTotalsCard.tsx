import React, { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface MonthlyTotalsCardProps {
  selectedYear: number
  selectedMonth: number | null
}

export const MonthlyTotalsCard: React.FC<MonthlyTotalsCardProps> = ({
  selectedYear,
  selectedMonth
}) => {
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({ qhh: 0, quotes: 0, items: 0, sales: 0 })

  useEffect(() => {
    loadTotals()
  }, [selectedYear, selectedMonth])

  const loadTotals = async () => {
    setLoading(true)
    try {
      // Calculate date parameter (last day of selected month)
      const lastDay = new Date(selectedYear, selectedMonth || 12, 0)
      const dateParam = lastDay.toISOString().split('T')[0]
      
      const { data, error } = await supabase.rpc('mtd_producer_metrics', { d: dateParam })
      
      if (error) throw error

      // Sum up per-producer totals (same logic as Team Dashboard)
      const qhh = data?.reduce((sum, p) => sum + (p.qhh || 0), 0) || 0
      const quotes = data?.reduce((sum, p) => sum + (p.quotes || 0), 0) || 0
      const items = data?.reduce((sum, p) => sum + (p.items || 0), 0) || 0
      const sales = data?.reduce((sum, p) => sum + (p.sales || 0), 0) || 0

      setTotals({ qhh, quotes, items, sales })
    } catch (error) {
      console.error('Error loading monthly totals:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Monthly Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i}>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-8 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Monthly Totals (Verified)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">QHH</div>
            <div className="text-3xl font-bold text-primary">{totals.qhh}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Quotes</div>
            <div className="text-3xl font-bold text-primary">{totals.quotes}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Items</div>
            <div className="text-3xl font-bold text-primary">{totals.items}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Sales</div>
            <div className="text-3xl font-bold text-primary">{totals.sales}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

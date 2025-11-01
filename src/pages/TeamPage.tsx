import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Leaderboard } from '@/components/Leaderboard'
import { MonthYearPickers } from '@/components/MonthYearPickers'
import { Users, Calendar } from 'lucide-react'

const TeamPage: React.FC = () => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [teamMetrics, setTeamMetrics] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState<number | null>(10)  // October
  const [selectedYear, setSelectedYear] = useState(2025)

  useEffect(() => {
    loadTeamMetrics()
  }, [selectedMonth, selectedYear])

  const loadTeamMetrics = async () => {
    setLoading(true)
    try {
      // Calculate date based on selected month/year
      let dateParam: string
      
      if (selectedMonth) {
        // Specific month selected: use last day of that month
        const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0)
        dateParam = lastDayOfMonth.toISOString().split('T')[0]
      } else {
        // "All Months" selected: use last day of selected year
        const lastDayOfYear = new Date(selectedYear, 11, 31)
        dateParam = lastDayOfYear.toISOString().split('T')[0]
      }
      
      console.log('🔍 Calling mtd_producer_metrics with date:', dateParam)
      console.log('🔍 Selected period:', { month: selectedMonth, year: selectedYear })
      
      const { data, error } = await supabase.rpc('mtd_producer_metrics', { d: dateParam })
      
      console.log('🔍 RPC returned data:', data)
      console.log('🔍 Sales totals:', data?.map(p => ({ name: p.producer_name, sales: p.sales })))
      
      if (error) {
        console.error('Error loading team metrics:', error)
        return
      }

      setTeamMetrics(data || [])
    } catch (error) {
      console.error('Error loading team metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Team Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Monitor team performance and track daily standards
          </p>
        </div>

        {/* Month/Year Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
            <CardDescription>Select time period for team performance</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthYearPickers
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onYearChange={setSelectedYear}
              onMonthChange={setSelectedMonth}
            />
          </CardContent>
        </Card>

        {/* Team Leaderboard */}
        <Leaderboard 
          metrics={teamMetrics}
          loading={loading}
          onRefresh={loadTeamMetrics}
        />
      </div>
  )
}

export default TeamPage
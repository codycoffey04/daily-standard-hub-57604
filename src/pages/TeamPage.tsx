import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Leaderboard } from '@/components/Leaderboard'

import { Users, Calendar } from 'lucide-react'

const TeamPage: React.FC = () => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [teamMetrics, setTeamMetrics] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadTeamMetrics()
  }, [selectedMonth, selectedYear])

  const loadTeamMetrics = async () => {
    setLoading(true)
    try {
      // Pass explicit date to get full month data (e.g., last day of current month)
      const now = new Date()
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const dateParam = lastDayOfMonth.toISOString().split('T')[0]
      
      console.log('🔍 Calling mtd_producer_metrics with date:', dateParam)
      
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

        {/* Month/Year Filters - Temporarily hidden until RPC date parameter issue is resolved */}
        {/* <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium mb-1">Month</label>
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-input rounded-md"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-input rounded-md"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card> */}

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
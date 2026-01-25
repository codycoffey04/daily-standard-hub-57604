import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { getDefaultEntryDate, today, yesterday, isPast6PM } from '@/lib/timezone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DailyEntryForm } from '@/components/DailyEntryForm'
import { YesterdayStatusBanner } from '@/components/YesterdayStatusBanner'
import { ProducerDashboard } from '@/components/producer-dashboard'
import { Calendar } from 'lucide-react'

const HomePage: React.FC = () => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [producerData, setProducerData] = useState<any>(null)
  const [todayEntry, setTodayEntry] = useState<any>(null)
  const [yesterdayStatus, setYesterdayStatus] = useState<any>(null)

  useEffect(() => {
    if (profile?.producer_id) {
      loadProducerData()
    }
  }, [profile])

  const loadProducerData = async () => {
    if (!profile?.producer_id) return

    setLoading(true)
    try {
      // Load producer info
      const { data: producer } = await supabase
        .from('producers')
        .select('*')
        .eq('id', profile.producer_id)
        .maybeSingle()

    // Load today's entry if exists
    const { data: entry, error: entryError } = await supabase
      .from('daily_entries')
      .select(`
        *,
        daily_entry_sources (
          id,
          source_id,
          qhh,
          quotes,
          items,
          sources (id, name)
        )
      `)
      .eq('producer_id', profile.producer_id)
      .eq('entry_date', getDefaultEntryDate())
      .maybeSingle()

    // Log unexpected errors (but not "no rows found")
    if (entryError && entryError.code !== 'PGRST116') {
      console.error('Error loading today entry:', entryError)
    }

      // Load yesterday status
      const { data: status } = await (supabase as any)
        .from('yesterday_status')
        .select('*')
        .eq('producer_id', profile.producer_id)
        .maybeSingle()

      setProducerData(producer)
      setTodayEntry(entry)
      setYesterdayStatus(status)

    } catch (error) {
      console.error('Error loading producer data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEntrySubmitted = () => {
    loadProducerData() // Refresh data after submission
    // Trigger dashboard refresh via custom event
    window.dispatchEvent(new CustomEvent('producer-dashboard-refresh'))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Yesterday Status Banner */}
        {yesterdayStatus && (
          <YesterdayStatusBanner status={yesterdayStatus} className="mb-6" />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Entry Form */}
          <div className="lg:col-span-2">
            <DailyEntryForm 
              producerId={profile?.producer_id || ''}
              existingEntry={todayEntry}
              onSubmitted={handleEntrySubmitted}
            />
          </div>

          {/* Right Sidebar - Stats */}
          <div className="space-y-6">
            {/* Today Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Daily Minimums</CardTitle>
                <CardDescription>Progress toward today's standards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Outbound Dials</span>
                    <span className="text-sm">
                      {todayEntry?.outbound_dials || 0} / 100
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ 
                        width: `${Math.min(100, ((todayEntry?.outbound_dials || 0) / 100) * 100)}%` 
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Talk Minutes</span>
                    <span className="text-sm">
                      {todayEntry?.talk_minutes || 0} / 180
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ 
                        width: `${Math.min(100, ((todayEntry?.talk_minutes || 0) / 180) * 100)}%` 
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">QHH</span>
                    <span className="text-sm">
                      {todayEntry?.qhh_total || 0} / 4
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-success rounded-full h-2 transition-all"
                      style={{ 
                        width: `${Math.min(100, ((todayEntry?.qhh_total || 0) / 4) * 100)}%` 
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Items Sold</span>
                    <span className="text-sm">
                      {todayEntry?.items_total || 0} / 2
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-success rounded-full h-2 transition-all"
                      style={{ 
                        width: `${Math.min(100, ((todayEntry?.items_total || 0) / 2) * 100)}%` 
                      }}
                    />
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Producer Dashboard */}
            <ProducerDashboard producerId={profile?.producer_id} />
          </div>
        </div>
      </div>
  )
}

export default HomePage
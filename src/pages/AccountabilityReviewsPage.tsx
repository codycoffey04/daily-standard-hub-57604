import { useState, useEffect } from 'react'

import { AccountabilityQueue } from '@/components/AccountabilityQueue'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { canAccessAccountabilityReviews } from '@/lib/auth'
import { Navigate } from 'react-router-dom'

interface DailyEntryForReview {
  id: string
  entry_date: string
  created_at: string
  outbound_dials: number
  talk_minutes: number
  qhh_total: number
  items_total: number
  sales_total: number
  producer: {
    display_name: string
  }
  has_accountability_review: boolean
}

export const AccountabilityReviewsPage = () => {
  const { profile, loading } = useAuth()
  const [reviewQueue, setReviewQueue] = useState<DailyEntryForReview[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Check access permissions
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!canAccessAccountabilityReviews(profile)) {
    return <Navigate to="/home" replace />
  }

  const loadAccountabilityQueue = async () => {
    try {
      setIsLoading(true)
      
      // Get today's date in the database timezone (start of day)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayStartISO = todayStart.toISOString()
      
      // Fetch daily entries that need accountability review (submitted today)
      const { data: entries, error } = await supabase
        .from('daily_entries')
        .select(`
          id,
          entry_date,
          created_at,
          outbound_dials,
          talk_minutes,
          qhh_total,
          items_total,
          sales_total,
          producer:producers (
            display_name
          )
        `)
        .gte('created_at', todayStartISO)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading accountability queue:', error)
        return
      }

      // Check which entries already have accountability reviews
      const entryIds = entries?.map(entry => entry.id) || []
      const { data: existingReviews, error: reviewError } = await supabase
        .from('accountability_reviews')
        .select('daily_entry_id')
        .in('daily_entry_id', entryIds)

      if (reviewError) {
        console.error('Error checking existing reviews:', reviewError)
        return
      }

      const reviewedEntryIds = new Set(existingReviews?.map(r => r.daily_entry_id) || [])

      // Filter out entries that already have reviews and format the data
      const queueEntries: DailyEntryForReview[] = (entries || [])
        .map(entry => ({
          id: entry.id,
          entry_date: entry.entry_date,
          created_at: entry.created_at,
          outbound_dials: entry.outbound_dials,
          talk_minutes: entry.talk_minutes,
          qhh_total: entry.qhh_total,
          items_total: entry.items_total,
          sales_total: entry.sales_total,
          producer: entry.producer,
          has_accountability_review: reviewedEntryIds.has(entry.id)
        }))
        .filter(entry => !entry.has_accountability_review)

      setReviewQueue(queueEntries)
    } catch (error) {
      console.error('Error in loadAccountabilityQueue:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAccountabilityQueue()
  }, [])

  const handleRefresh = () => {
    loadAccountabilityQueue()
  }

  return (
    <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Accountability Reviews
          </h1>
          <p className="text-muted-foreground">
            Review today's producer entries and provide coaching feedback
          </p>
        </div>

        <AccountabilityQueue 
          entries={reviewQueue}
          loading={isLoading}
          onRefresh={handleRefresh}
      />
    </main>
  )
}
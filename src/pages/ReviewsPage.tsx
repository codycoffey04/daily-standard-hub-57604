import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ReviewQueue } from '@/components/ReviewQueue'
import { Navigation } from '@/components/Navigation'
import { CheckCircle, FileText } from 'lucide-react'

const ReviewsPage: React.FC = () => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [reviewQueue, setReviewQueue] = useState<any[]>([])

  useEffect(() => {
    loadReviewQueue()
  }, [])

  const loadReviewQueue = async () => {
    setLoading(true)
    try {
      // Get entries from yesterday and today that need review
      const { data, error } = await supabase
        .from('daily_entries')
        .select(`
          *,
          producers (display_name),
          reviews (id, status),
          daily_entry_sources (
            *,
            sources (name)
          )
        `)
        .in('entry_date', [
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          new Date().toISOString().split('T')[0]
        ])
        .order('entry_date', { ascending: false })

      if (error) {
        console.error('Error loading review queue:', error)
        return
      }

      // Filter entries that don't have reviews yet
      const needsReview = (data || []).filter(entry => 
        !entry.reviews || entry.reviews.length === 0
      )

      setReviewQueue(needsReview)
    } catch (error) {
      console.error('Error loading review queue:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewSubmitted = () => {
    loadReviewQueue() // Refresh queue after review
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <CheckCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Reviews</h1>
          </div>
          <p className="text-muted-foreground">
            Review and approve daily entries from team members
          </p>
        </div>

        {/* Review Queue */}
        <ReviewQueue 
          entries={reviewQueue}
          loading={loading}
          onReviewSubmitted={handleReviewSubmitted}
          onRefresh={loadReviewQueue}
        />
      </div>
    </div>
  )
}

export default ReviewsPage
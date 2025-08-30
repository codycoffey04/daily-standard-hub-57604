import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, CheckCircle, Flag } from 'lucide-react'

interface ReviewQueueProps {
  entries: any[]
  loading: boolean
  onReviewSubmitted: () => void
  onRefresh: () => void
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({ entries, loading, onReviewSubmitted, onRefresh }) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Review Queue</CardTitle>
            <CardDescription>{entries.length} entries need review</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>All entries have been reviewed!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map(entry => (
              <div key={entry.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium">{entry.producers?.display_name}</h3>
                    <p className="text-sm text-muted-foreground">{entry.entry_date}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => {/* Handle approve */}}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {/* Handle flag */}}>
                      <Flag className="h-4 w-4 mr-1" />
                      Flag
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>Dials: {entry.outbound_dials}</div>
                  <div>Talk: {entry.talk_minutes}m</div>
                  <div>QHH: {entry.qhh_total}</div>
                  <div>Items: {entry.items_total}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
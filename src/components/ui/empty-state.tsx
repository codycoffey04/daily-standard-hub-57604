import React from 'react'
import { BarChart3 } from 'lucide-react'

interface EmptyStateProps {
  message?: string
  suggestion?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message = "No data for selected period",
  suggestion = "Try selecting a different time period"
}) => {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center space-y-4">
        <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto" />
        <div>
          <p className="text-lg font-medium text-foreground">{message}</p>
          <p className="text-sm text-muted-foreground mt-2">{suggestion}</p>
        </div>
      </div>
    </div>
  )
}
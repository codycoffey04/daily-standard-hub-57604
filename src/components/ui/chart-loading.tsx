import React from 'react'
import { Loader2 } from 'lucide-react'

export const ChartLoading: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 text-primary mx-auto animate-spin" />
        <p className="text-sm text-muted-foreground">Loading data...</p>
      </div>
    </div>
  )
}
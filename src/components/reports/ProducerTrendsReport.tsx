import React from 'react'
import { Wrench } from 'lucide-react'

interface ProducerTrendsReportProps {
  selectedYear: number
  selectedMonth: number | null
}

export const ProducerTrendsReport: React.FC<ProducerTrendsReportProps> = () => {
  return (
    <div className="flex items-center justify-center h-96 bg-muted/20 rounded-lg border-2 border-dashed border-warning/50">
      <div className="text-center space-y-4 p-8">
        <Wrench className="h-12 w-12 text-warning mx-auto" />
        <div className="text-2xl font-semibold text-foreground">
          Producer Trends Report
        </div>
        <p className="text-lg text-muted-foreground max-w-md">
          This report is temporarily under maintenance.
        </p>
        <p className="text-sm text-muted-foreground">
          We're working on improvements and will have it back online soon!
        </p>
      </div>
    </div>
  )
}


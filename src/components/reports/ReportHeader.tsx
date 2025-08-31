import React from 'react'
import { Button } from '@/components/ui/button'
import { Download, Printer, RefreshCw } from 'lucide-react'
import { MonthYearPickers } from '@/components/MonthYearPickers'
import { type ReportConfig } from '@/config/reportConfig'

interface ReportHeaderProps {
  report: ReportConfig
  selectedYear: number
  selectedMonth: number | null
  onYearChange: (year: number) => void
  onMonthChange: (month: number | null) => void
  onRefresh?: () => void
  isLoading?: boolean
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  report,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  onRefresh,
  isLoading = false
}) => {
  const Icon = report.icon

  const handleExport = () => {
    // Placeholder for export functionality
    console.log('Export report:', report.id)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="bg-card border-b border-border p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {report.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {report.description}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <MonthYearPickers
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onYearChange={onYearChange}
            onMonthChange={onMonthChange}
          />
          
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
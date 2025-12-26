import React from 'react'
import { Button } from '@/components/ui/button'
import { Download, Printer, RefreshCw, BarChart3 } from 'lucide-react'
import { MonthYearPickers } from '@/components/MonthYearPickers'
import { type ReportConfig } from '@/config/reportConfig'

interface ReportHeaderProps {
  report: ReportConfig
  selectedYear: number
  selectedMonth: number | null
  onYearChange: (year: number) => void
  onMonthChange: (month: number | null) => void
  onRefresh?: () => void
  onExport?: () => void
  isLoading?: boolean
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  report,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  onRefresh,
  onExport,
  isLoading = false
}) => {
  const Icon = report?.icon ?? BarChart3

  const handleExport = () => {
    if (onExport) {
      onExport()
    } else {
      console.log('Export not available for report:', report.id)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="bg-card border-b border-border p-6">
      {/* Top row: Date filters on left, action buttons on right */}
      <div className="flex items-center justify-between mb-6">
        {report.id !== 'conversion-funnel' && report.id !== 'ytd-performance' && (
          <MonthYearPickers
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onYearChange={onYearChange}
            onMonthChange={onMonthChange}
          />
        )}
        {(report.id === 'conversion-funnel' || report.id === 'ytd-performance') && <div />}

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

      {/* Second row: Centered title and description */}
      <div className="flex items-center justify-center space-x-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            {report?.title ?? "Loading…"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {report?.description ?? ""}
          </p>
        </div>
      </div>
    </div>
  )
}
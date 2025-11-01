import React, { useState, useEffect } from 'react'

import { ReportSidebar } from '@/components/reports/ReportSidebar'
import { ReportHeader } from '@/components/reports/ReportHeader'
import { QHHBySourceReport } from '@/components/reports/QHHBySourceReport'
import { QuotesBySourceReport } from '@/components/reports/QuotesBySourceReport'
import { ItemsByProducerReport } from '@/components/reports/ItemsByProducerReport'
import { ItemsBySourceReport } from '@/components/reports/ItemsBySourceReport'
import { ProducerSourceMatrixReport } from '@/components/reports/ProducerSourceMatrixReport'
import { QHHByProducerReport } from '@/components/reports/QHHByProducerReport'
import { QuotesByProducerReport } from '@/components/reports/QuotesByProducerReport'
import { ProducerSourceMatrixQHHReport } from '@/components/reports/ProducerSourceMatrixQHHReport'
import { ProducerSourceMatrixQuotesReport } from '@/components/reports/ProducerSourceMatrixQuotesReport'
import { SourceROICalculatorReport } from '@/components/reports/SourceROICalculatorReport'
import { SalesByProducerReport } from '@/components/reports/SalesByProducerReport'
import { ProducerTrendsReport } from '@/components/reports/ProducerTrendsReport'
import { ReviewSummaryReport } from '@/components/reports/ReviewSummaryReport'
import CommonWeakPointsReport from '@/components/reports/CommonWeakPointsReport'
import MonthlySummaryReport from '@/components/reports/MonthlySummaryReport'
import { ExecutionFunnelReport } from '@/components/reports/ExecutionFunnelReport'
import YTDPerformanceReport from '@/components/reports/YTDPerformanceReport'
import { CoachingEffectivenessReport } from '@/components/reports/CoachingEffectivenessReport'
import { ZipCodePerformanceReport } from '@/components/reports/ZipCodePerformanceReport'
import { reportCategories, getReportById } from '@/config/reportConfig'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

// Placeholder components for future reports
const PlaceholderReport: React.FC<{ reportTitle: string }> = ({ reportTitle }) => (
  <div className="flex items-center justify-center h-96 bg-muted/20 rounded-lg border-2 border-dashed border-muted">
    <div className="text-center space-y-3">
      <div className="text-lg font-medium text-muted-foreground">
        {reportTitle}
      </div>
      <p className="text-sm text-muted-foreground">
        Coming soon - This report is under development
      </p>
    </div>
  </div>
)

interface ReportContentProps {
  reportId: string
  selectedYear: number
  selectedMonth: number | null
}

const ReportContent: React.FC<ReportContentProps> = ({
  reportId,
  selectedYear,
  selectedMonth
}) => {
  switch (reportId) {
    case 'monthly-summary':
      return <MonthlySummaryReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'qhh-by-source':
      return <QHHBySourceReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'quotes-by-source':
      return <QuotesBySourceReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'qhh-by-producer':
      return <QHHByProducerReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'quotes-by-producer':
      return <QuotesByProducerReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'producer-source-matrix-qhh':
      return <ProducerSourceMatrixQHHReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'producer-source-matrix-quotes':
      return <ProducerSourceMatrixQuotesReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'items-by-producer':
      return <ItemsByProducerReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'items-by-source':
      return <ItemsBySourceReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'producer-source-matrix':
      return <ProducerSourceMatrixReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'source-roi-calculator':
      return <SourceROICalculatorReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'sales-by-producer':
      return <SalesByProducerReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'producer-trends':
      return <ProducerTrendsReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'review-summary':
      return <ReviewSummaryReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'common-weak-points':
      return <CommonWeakPointsReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'conversion-funnel':
      return <ExecutionFunnelReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'ytd-performance':
      return <YTDPerformanceReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'zip-code-performance':
      return <ZipCodePerformanceReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'coaching-effectiveness':
      return <CoachingEffectivenessReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    default:
      const report = getReportById(reportId)
      return <PlaceholderReport reportTitle={report?.title || 'Unknown Report'} />
  }
}

const SummariesPage: React.FC = () => {
  const isMobile = useIsMobile()
  const [selectedYear, setSelectedYear] = useState(2025)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(10) // Default to October
  const [activeReportId, setActiveReportId] = useState('qhh-by-source')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['lead-source-analysis']) // Start with lead source analysis expanded
  )
  
  // Sidebar collapsed state with localStorage persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('reports-sidebar-collapsed')
    return stored ? JSON.parse(stored) : isMobile
  })

  // Persist sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('reports-sidebar-collapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  // Update sidebar state when mobile state changes
  useEffect(() => {
    if (isMobile && !sidebarCollapsed) {
      setSidebarCollapsed(true)
    }
  }, [isMobile, sidebarCollapsed])

  // Find the active report config
  const activeReport = getReportById(activeReportId)

  // Initialize expanded categories to include the category of the active report
  useEffect(() => {
    if (activeReport) {
      setExpandedCategories(prev => new Set([...prev, activeReport.category]))
    }
  }, [activeReport])

  const handleCategoryToggle = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const handleReportChange = (reportId: string) => {
    setActiveReportId(reportId)
  }

  const handleSidebarToggle = () => {
    setSidebarCollapsed(prev => !prev)
  }

  if (!activeReport) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="text-lg font-medium text-foreground">
            Report not found
          </div>
          <p className="text-muted-foreground">
            The requested report could not be loaded
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <ReportSidebar
        activeReportId={activeReportId}
        onReportChange={handleReportChange}
        expandedCategories={expandedCategories}
        onCategoryToggle={handleCategoryToggle}
        collapsed={sidebarCollapsed}
        onToggle={handleSidebarToggle}
      />
      
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "ml-0" : "ml-8"
      )}>
        <ReportHeader
          report={activeReport}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
        />
        
        <div className="flex-1 overflow-y-auto p-6">
          <ReportContent
            reportId={activeReportId}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
        </div>
      </div>
    </div>
  )
}

export default SummariesPage
import React, { useState, useEffect } from 'react'
import { Navigation } from '@/components/Navigation'
import { ReportSidebar } from '@/components/reports/ReportSidebar'
import { ReportHeader } from '@/components/reports/ReportHeader'
import { QHHBySourceReport } from '@/components/reports/QHHBySourceReport'
import { QuotesBySourceReport } from '@/components/reports/QuotesBySourceReport'
import { ItemsByProducerReport } from '@/components/reports/ItemsByProducerReport'
import { ProducerSourceMatrixReport } from '@/components/reports/ProducerSourceMatrixReport'
import { reportCategories, getReportById } from '@/config/reportConfig'

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
    case 'qhh-by-source':
      return <QHHBySourceReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'quotes-by-source':
      return <QuotesBySourceReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'items-by-producer':
      return <ItemsByProducerReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    case 'producer-source-matrix':
      return <ProducerSourceMatrixReport selectedYear={selectedYear} selectedMonth={selectedMonth} />
    default:
      const report = getReportById(reportId)
      return <PlaceholderReport reportTitle={report?.title || 'Unknown Report'} />
  }
}

const SummariesPage: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(2025)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [activeReportId, setActiveReportId] = useState('qhh-by-source')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['lead-source-analysis']) // Start with lead source analysis expanded
  )

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

  if (!activeReport) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex h-[calc(100vh-64px)]">
        <ReportSidebar
          activeReportId={activeReportId}
          onReportChange={handleReportChange}
          expandedCategories={expandedCategories}
          onCategoryToggle={handleCategoryToggle}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
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
    </div>
  )
}

export default SummariesPage
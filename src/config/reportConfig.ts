import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target,
  Database,
  PieChart,
  Calculator,
  UserCheck,
  ClipboardList,
  Award,
  MessageSquare
} from 'lucide-react'

export interface ReportConfig {
  id: string
  title: string
  icon: typeof BarChart3
  description: string
  component: string
  category: string
}

export interface ReportCategory {
  id: string
  title: string
  reports: ReportConfig[]
}

export const reportCategories: ReportCategory[] = [
  {
    id: 'performance-metrics',
    title: 'Performance Metrics',
    reports: [
      {
        id: 'monthly-summary',
        title: 'Monthly Summary',
        icon: BarChart3,
        description: 'Key metrics and team performance overview',
        component: 'MonthlySummaryReport',
        category: 'performance-metrics'
      },
      {
        id: 'conversion-funnel',
        title: 'Execution Funnel Dashboard',
        icon: TrendingUp,
        description: 'Analyze sales execution with benchmarks and efficiency metrics',
        component: 'ExecutionFunnelReport',
        category: 'performance-metrics'
      },
      {
        id: 'ytd-performance',
        title: 'YTD Performance',
        icon: Target,
        description: 'Year-to-date performance trends',
        component: 'YTDPerformanceReport',
        category: 'performance-metrics'
      }
    ]
  },
  {
    id: 'lead-source-analysis',
    title: 'Lead Source Analysis',
    reports: [
      {
        id: 'qhh-by-source',
        title: 'QHH by Source',
        icon: Database,
        description: 'Quoted households breakdown by lead source',
        component: 'QHHBySourceReport',
        category: 'lead-source-analysis'
      },
      {
        id: 'quotes-by-source',
        title: 'Quotes by Source',
        icon: PieChart,
        description: 'Quote generation by lead source',
        component: 'QuotesBySourceReport',
        category: 'lead-source-analysis'
      },
      {
        id: 'items-by-source',
        title: 'Items by Source',
        icon: BarChart3,
        description: 'Items sold breakdown by source',
        component: 'ItemsBySourceReport',
        category: 'lead-source-analysis'
      },
      {
        id: 'source-roi-calculator',
        title: 'Source ROI Calculator',
        icon: Calculator,
        description: 'Calculate return on investment by source',
        component: 'SourceROICalculatorReport',
        category: 'lead-source-analysis'
      }
    ]
  },
  {
    id: 'producer-analytics',
    title: 'Producer Analytics',
    reports: [
      {
        id: 'qhh-by-producer',
        title: 'QHH by Producer by Month',
        icon: Database,
        description: 'Quoted households breakdown by producer',
        component: 'QHHByProducerReport',
        category: 'producer-analytics'
      },
      {
        id: 'quotes-by-producer',
        title: 'Quotes by Producer by Month',
        icon: MessageSquare,
        description: 'Quote totals by producer',
        component: 'QuotesByProducerReport',
        category: 'producer-analytics'
      },
      {
        id: 'producer-source-matrix-qhh',
        title: 'Producer × Source Matrix - QHH',
        icon: Target,
        description: 'QHH breakdown by producer and source',
        component: 'ProducerSourceMatrixQHHReport',
        category: 'producer-analytics'
      },
      {
        id: 'producer-source-matrix-quotes',
        title: 'Producer × Source Matrix - Quotes',
        icon: BarChart3,
        description: 'Quotes breakdown by producer and source',
        component: 'ProducerSourceMatrixQuotesReport',
        category: 'producer-analytics'
      },
      {
        id: 'items-by-producer',
        title: 'Items by Producer',
        icon: UserCheck,
        description: 'Items sold by each producer',
        component: 'ItemsByProducerReport',
        category: 'producer-analytics'
      },
      {
        id: 'sales-by-producer',
        title: 'Sales by Producer',
        icon: TrendingUp,
        description: 'Sales performance by producer',
        component: 'SalesByProducerReport',
        category: 'producer-analytics'
      },
      {
        id: 'producer-trends',
        title: 'Producer Trends',
        icon: BarChart3,
        description: 'Performance trends over time',
        component: 'ProducerTrendsReport',
        category: 'producer-analytics'
      },
      {
        id: 'producer-source-matrix',
        title: 'Producer × Source Matrix',
        icon: Target,
        description: 'Cross-analysis of producers and sources',
        component: 'ProducerSourceMatrixReport',
        category: 'producer-analytics'
      }
    ]
  },
  {
    id: 'accountability-insights',
    title: 'Accountability Insights',
    reports: [
      {
        id: 'review-summary',
        title: 'Review Summary',
        icon: ClipboardList,
        description: 'Summary of accountability reviews',
        component: 'ReviewSummaryReport',
        category: 'accountability-insights'
      },
      {
        id: 'common-weak-points',
        title: 'Common Weak Points',
        icon: MessageSquare,
        description: 'Most frequent areas for improvement',
        component: 'CommonWeakPointsReport',
        category: 'accountability-insights'
      },
      {
        id: 'coaching-effectiveness',
        title: 'Coaching Effectiveness',
        icon: Award,
        description: 'Measure coaching impact and improvement',
        component: 'CoachingEffectivenessReport',
        category: 'accountability-insights'
      }
    ]
  }
]

export const getReportById = (id: string): ReportConfig | undefined => {
  for (const category of reportCategories) {
    const report = category.reports.find(r => r.id === id)
    if (report) return report
  }
  return undefined
}

export const getReportsByCategory = (categoryId: string): ReportConfig[] => {
  const category = reportCategories.find(c => c.id === categoryId)
  return category?.reports || []
}
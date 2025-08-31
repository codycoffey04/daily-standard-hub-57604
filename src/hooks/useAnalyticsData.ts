import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { format, subDays } from 'date-fns'

interface ConversionFunnelData {
  current: {
    qhhToItems: number
    itemsToSales: number
    totalQhh: number
    totalItems: number
    totalSales: number
  }
  previous: {
    qhhToItems: number
    itemsToSales: number
  }
  trends: {
    qhhToItemsChange: number
    itemsToSalesChange: number
  }
  alerts: {
    qhhToItemsAlert: boolean
    itemsToSalesAlert: boolean
  }
}

interface ProducerAlert {
  producer_id: string
  producer_name: string
  severity: 'Critical' | 'Warning' | 'OK'
  issues: string[]
  conversion_rate: number
}

interface WeakStepFrequency {
  step: string
  count: number
  percentage: number
  isHighFrequency: boolean
}

interface CoachingEffectiveness {
  resolution_rate: number
  total_issues: number
  resolved_issues: number
  recurring_issues: number
  improvement_trend: 'positive' | 'negative' | 'stable'
}

export const useConversionFunnelData = (dateRange: { from: Date; to: Date }) => {
  return useQuery({
    queryKey: ['conversion-funnel', dateRange],
    queryFn: async (): Promise<ConversionFunnelData> => {
      const currentStart = format(dateRange.from, 'yyyy-MM-dd')
      const currentEnd = format(dateRange.to, 'yyyy-MM-dd')
      
      // Calculate previous period dates
      const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      const previousStart = format(subDays(dateRange.from, daysDiff), 'yyyy-MM-dd')
      const previousEnd = format(subDays(dateRange.to, daysDiff), 'yyyy-MM-dd')

      // Fetch current period data
      const { data: currentData } = await supabase
        .from('daily_entries')
        .select('qhh_total, items_total, sales_total')
        .gte('entry_date', currentStart)
        .lte('entry_date', currentEnd)

      // Fetch previous period data
      const { data: previousData } = await supabase
        .from('daily_entries')
        .select('qhh_total, items_total, sales_total')
        .gte('entry_date', previousStart)
        .lte('entry_date', previousEnd)

      // Calculate current period metrics
      const currentTotals = currentData?.reduce(
        (acc, entry) => ({
          qhh: acc.qhh + entry.qhh_total,
          items: acc.items + entry.items_total,
          sales: acc.sales + entry.sales_total
        }),
        { qhh: 0, items: 0, sales: 0 }
      ) || { qhh: 0, items: 0, sales: 0 }

      // Calculate previous period metrics
      const previousTotals = previousData?.reduce(
        (acc, entry) => ({
          qhh: acc.qhh + entry.qhh_total,
          items: acc.items + entry.items_total,
          sales: acc.sales + entry.sales_total
        }),
        { qhh: 0, items: 0, sales: 0 }
      ) || { qhh: 0, items: 0, sales: 0 }

      // Calculate conversion rates
      const currentQhhToItems = currentTotals.qhh > 0 ? (currentTotals.items / currentTotals.qhh) * 100 : 0
      const currentItemsToSales = currentTotals.items > 0 ? (currentTotals.sales / currentTotals.items) * 100 : 0
      
      const previousQhhToItems = previousTotals.qhh > 0 ? (previousTotals.items / previousTotals.qhh) * 100 : 0
      const previousItemsToSales = previousTotals.items > 0 ? (previousTotals.sales / previousTotals.items) * 100 : 0

      // Calculate trends
      const qhhToItemsChange = currentQhhToItems - previousQhhToItems
      const itemsToSalesChange = currentItemsToSales - previousItemsToSales

      // Check for alerts (>20% drop)
      const qhhToItemsAlert = qhhToItemsChange < -20
      const itemsToSalesAlert = itemsToSalesChange < -20

      return {
        current: {
          qhhToItems: currentQhhToItems,
          itemsToSales: currentItemsToSales,
          totalQhh: currentTotals.qhh,
          totalItems: currentTotals.items,
          totalSales: currentTotals.sales
        },
        previous: {
          qhhToItems: previousQhhToItems,
          itemsToSales: previousItemsToSales
        },
        trends: {
          qhhToItemsChange,
          itemsToSalesChange
        },
        alerts: {
          qhhToItemsAlert,
          itemsToSalesAlert
        }
      }
    }
  })
}

export const useProducerPerformanceAlerts = (dateRange: { from: Date; to: Date }, selectedProducer?: string) => {
  return useQuery({
    queryKey: ['producer-performance-alerts', dateRange, selectedProducer],
    queryFn: async (): Promise<ProducerAlert[]> => {
      let query = supabase
        .from('accountability_reviews')
        .select(`
          daily_entries!inner(
            producer_id,
            qhh_total,
            items_total,
            entry_date,
            producers!inner(
              display_name
            )
          ),
          metrics_achieved,
          weak_steps
        `)
        .gte('daily_entries.entry_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('daily_entries.entry_date', format(dateRange.to, 'yyyy-MM-dd'))

      if (selectedProducer && selectedProducer !== 'all') {
        query = query.eq('daily_entries.producer_id', selectedProducer)
      }

      const { data: reviewsData } = await query

      // Group by producer
      const producerMap = new Map<string, {
        name: string
        totalQhh: number
        totalItems: number
        failedMetrics: number
        totalReviews: number
        weakSteps: string[]
      }>()

      reviewsData?.forEach(review => {
        const producerId = review.daily_entries.producer_id
        const producerName = review.daily_entries.producers.display_name
        
        if (!producerMap.has(producerId)) {
          producerMap.set(producerId, {
            name: producerName,
            totalQhh: 0,
            totalItems: 0,
            failedMetrics: 0,
            totalReviews: 0,
            weakSteps: []
          })
        }

        const producer = producerMap.get(producerId)!
        producer.totalQhh += review.daily_entries.qhh_total
        producer.totalItems += review.daily_entries.items_total
        producer.totalReviews += 1
        
        if (review.metrics_achieved === false) {
          producer.failedMetrics += 1
        }
        
        if (review.weak_steps) {
          producer.weakSteps.push(...review.weak_steps)
        }
      })

      // Generate alerts
      const alerts: ProducerAlert[] = []
      
      producerMap.forEach((data, producerId) => {
        const conversionRate = data.totalQhh > 0 ? (data.totalItems / data.totalQhh) * 100 : 0
        const failedMetricsRate = data.totalReviews > 0 ? (data.failedMetrics / data.totalReviews) * 100 : 0
        
        const issues: string[] = []
        let severity: 'Critical' | 'Warning' | 'OK' = 'OK'

        // Check conversion rate
        if (conversionRate < 25) {
          issues.push(`Low QHH→Items conversion (${conversionRate.toFixed(1)}%)`)
          severity = 'Critical'
        }

        // Check failed metrics
        if (failedMetricsRate >= 50) {
          issues.push(`High failure rate (${failedMetricsRate.toFixed(0)}% of reviews)`)
          severity = 'Critical'
        } else if (failedMetricsRate >= 25) {
          issues.push(`Moderate failure rate (${failedMetricsRate.toFixed(0)}% of reviews)`)
          if (severity !== 'Critical') severity = 'Warning'
        }

        // Check repeated weak steps
        const weakStepCounts = data.weakSteps.reduce((acc, step) => {
          acc[step] = (acc[step] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        const repeatedSteps = Object.entries(weakStepCounts)
          .filter(([, count]) => count >= 2)
          .map(([step]) => step)

        if (repeatedSteps.length > 0) {
          issues.push(`Repeated issues: ${repeatedSteps.join(', ')}`)
          if (severity === 'OK') severity = 'Warning'
        }

        if (issues.length > 0) {
          alerts.push({
            producer_id: producerId,
            producer_name: data.name,
            severity,
            issues,
            conversion_rate: conversionRate
          })
        }
      })

      return alerts.sort((a, b) => {
        const severityOrder = { 'Critical': 0, 'Warning': 1, 'OK': 2 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      })
    }
  })
}

export const useSalesProcessGaps = (dateRange: { from: Date; to: Date }, selectedProducer?: string) => {
  return useQuery({
    queryKey: ['sales-process-gaps', dateRange, selectedProducer],
    queryFn: async (): Promise<WeakStepFrequency[]> => {
      let query = supabase
        .from('accountability_reviews')
        .select(`
          weak_steps,
          daily_entries!inner(
            entry_date,
            producer_id
          )
        `)
        .gte('daily_entries.entry_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('daily_entries.entry_date', format(dateRange.to, 'yyyy-MM-dd'))
        .not('weak_steps', 'is', null)

      if (selectedProducer && selectedProducer !== 'all') {
        query = query.eq('daily_entries.producer_id', selectedProducer)
      }

      const { data } = await query

      if (!data || data.length === 0) {
        return []
      }

      // Count weak steps frequency
      const stepCounts = new Map<string, number>()
      let totalSteps = 0

      data.forEach(review => {
        if (review.weak_steps) {
          review.weak_steps.forEach(step => {
            stepCounts.set(step, (stepCounts.get(step) || 0) + 1)
            totalSteps += 1
          })
        }
      })

      // Convert to array and calculate percentages
      const weakStepFrequencies: WeakStepFrequency[] = Array.from(stepCounts.entries())
        .map(([step, count]) => ({
          step,
          count,
          percentage: totalSteps > 0 ? (count / totalSteps) * 100 : 0,
          isHighFrequency: totalSteps > 0 && (count / totalSteps) * 100 > 30
        }))
        .sort((a, b) => b.count - a.count)

      return weakStepFrequencies
    }
  })
}

export const useCoachingEffectiveness = (dateRange: { from: Date; to: Date }, selectedProducer?: string) => {
  return useQuery({
    queryKey: ['coaching-effectiveness', dateRange, selectedProducer],
    queryFn: async (): Promise<CoachingEffectiveness> => {
      let query = supabase
        .from('accountability_reviews')
        .select(`
          weak_steps,
          course_corrections_addressed,
          daily_entries!inner(
            entry_date,
            producer_id
          )
        `)
        .gte('daily_entries.entry_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('daily_entries.entry_date', format(dateRange.to, 'yyyy-MM-dd'))
        .order('daily_entries(entry_date)', { ascending: true })

      if (selectedProducer && selectedProducer !== 'all') {
        query = query.eq('daily_entries.producer_id', selectedProducer)
      }

      const { data } = await query

      if (!data || data.length === 0) {
        return {
          resolution_rate: 0,
          total_issues: 0,
          resolved_issues: 0,
          recurring_issues: 0,
          improvement_trend: 'stable'
        }
      }

      // Track issues over time by producer
      const producerIssues = new Map<string, {
        issues: Array<{ date: string; steps: string[]; corrected: boolean }>
      }>()

      data.forEach(review => {
        const producerId = review.daily_entries.producer_id
        if (!producerIssues.has(producerId)) {
          producerIssues.set(producerId, { issues: [] })
        }

        if (review.weak_steps && review.weak_steps.length > 0) {
          producerIssues.get(producerId)!.issues.push({
            date: review.daily_entries.entry_date,
            steps: review.weak_steps,
            corrected: review.course_corrections_addressed === true
          })
        }
      })

      let totalIssues = 0
      let resolvedIssues = 0
      let recurringIssues = 0

      // Analyze resolution patterns
      producerIssues.forEach(producer => {
        const issuesByStep = new Map<string, Array<{ date: string; corrected: boolean }>>()
        
        // Group issues by step
        producer.issues.forEach(issue => {
          issue.steps.forEach(step => {
            if (!issuesByStep.has(step)) {
              issuesByStep.set(step, [])
            }
            issuesByStep.get(step)!.push({
              date: issue.date,
              corrected: issue.corrected
            })
          })
        })

        // Check for resolution
        issuesByStep.forEach(stepIssues => {
          totalIssues += stepIssues.length
          
          // Sort by date
          stepIssues.sort((a, b) => a.date.localeCompare(b.date))
          
          let wasResolved = false
          for (let i = 0; i < stepIssues.length - 1; i++) {
            if (stepIssues[i].corrected) {
              // Check if the issue doesn't reappear in subsequent reviews
              const hasLaterOccurrence = stepIssues.slice(i + 1).length > 0
              if (!hasLaterOccurrence) {
                resolvedIssues += 1
                wasResolved = true
                break
              } else {
                recurringIssues += 1
              }
            }
          }
          
          // If the last issue was corrected and no recurrence
          if (!wasResolved && stepIssues.length > 0 && stepIssues[stepIssues.length - 1].corrected) {
            resolvedIssues += 1
          }
        })
      })

      const resolutionRate = totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0
      
      // Determine trend (simplified - could be more sophisticated)
      const recentIssues = data.slice(-Math.ceil(data.length / 2))
      const earlyIssues = data.slice(0, Math.ceil(data.length / 2))
      
      const recentIssueCount = recentIssues.reduce((count, review) => 
        count + (review.weak_steps?.length || 0), 0)
      const earlyIssueCount = earlyIssues.reduce((count, review) => 
        count + (review.weak_steps?.length || 0), 0)
      
      let improvementTrend: 'positive' | 'negative' | 'stable' = 'stable'
      if (recentIssueCount < earlyIssueCount * 0.8) {
        improvementTrend = 'positive'
      } else if (recentIssueCount > earlyIssueCount * 1.2) {
        improvementTrend = 'negative'
      }

      return {
        resolution_rate: resolutionRate,
        total_issues: totalIssues,
        resolved_issues: resolvedIssues,
        recurring_issues: recurringIssues,
        improvement_trend: improvementTrend
      }
    }
  })
}
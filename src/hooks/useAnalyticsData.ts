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
      // Query daily_entries directly for real performance data
      let query = supabase
        .from('daily_entries')
        .select(`
          producer_id,
          entry_date,
          qhh_total,
          items_total,
          sales_total,
          producers!inner(
            display_name,
            active
          )
        `)
        .gte('entry_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('entry_date', format(dateRange.to, 'yyyy-MM-dd'))
        .eq('producers.active', true)

      if (selectedProducer && selectedProducer !== 'all') {
        query = query.eq('producer_id', selectedProducer)
      }

      const { data: dailyEntries, error } = await query

      if (error) throw error

      // Group by producer and calculate metrics
      const producerMap = new Map<string, {
        name: string
        totalQhh: number
        totalItems: number
        totalSales: number
        totalDays: number
        workingDays: number
        zeroItemDays: number
        consecutiveZeroDays: number
        entries: Array<{ date: string; qhh: number; items: number; sales: number }>
      }>()

      dailyEntries?.forEach(entry => {
        const producerId = entry.producer_id
        const producerName = entry.producers.display_name
        
        if (!producerMap.has(producerId)) {
          producerMap.set(producerId, {
            name: producerName,
            totalQhh: 0,
            totalItems: 0,
            totalSales: 0,
            totalDays: 0,
            workingDays: 0,
            zeroItemDays: 0,
            consecutiveZeroDays: 0,
            entries: []
          })
        }

        const producer = producerMap.get(producerId)!
        producer.totalQhh += entry.qhh_total
        producer.totalItems += entry.items_total
        producer.totalSales += entry.sales_total
        producer.totalDays += 1
        
        // Count working days (days with any activity)
        if (entry.qhh_total > 0 || entry.items_total > 0) {
          producer.workingDays += 1
        }
        
        // Count zero item days
        if (entry.items_total === 0) {
          producer.zeroItemDays += 1
        }
        
        producer.entries.push({
          date: entry.entry_date,
          qhh: entry.qhh_total,
          items: entry.items_total,
          sales: entry.sales_total
        })
      })

      // Calculate consecutive zero days for each producer
      producerMap.forEach((producer, producerId) => {
        const sortedEntries = producer.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        let consecutiveZeros = 0
        
        for (const entry of sortedEntries) {
          if (entry.items === 0) {
            consecutiveZeros += 1
          } else {
            break
          }
        }
        
        producer.consecutiveZeroDays = consecutiveZeros
      })

      // Generate alerts with new thresholds
      const alerts: ProducerAlert[] = []
      
      producerMap.forEach((data, producerId) => {
        const qhhToItemsConversion = data.totalQhh > 0 ? (data.totalItems / data.totalQhh) * 100 : 0
        const itemsToSalesConversion = data.totalItems > 0 ? (data.totalSales / data.totalItems) * 100 : 0
        const dailyQhhAverage = data.workingDays > 0 ? data.totalQhh / data.workingDays : 0
        
        // Calculate monthly pace (assume 20 working days per month)
        const daysInPeriod = Math.max(1, data.workingDays)
        const monthlyQhhPace = (data.totalQhh / daysInPeriod) * 20
        
        const issues: string[] = []
        let severity: 'Critical' | 'Warning' | 'OK' = 'OK'

        // CRITICAL THRESHOLDS
        if (qhhToItemsConversion < 15 && data.totalQhh > 0) {
          issues.push(`${qhhToItemsConversion.toFixed(1)}% QHH→Items conversion (should be 20%+)`)
          severity = 'Critical'
        }
        
        if (dailyQhhAverage < 5 && data.workingDays > 0) {
          issues.push(`${dailyQhhAverage.toFixed(1)} QHH/day (${((dailyQhhAverage / 10) * 100).toFixed(0)}% of 10/day target)`)
          severity = 'Critical'
        }
        
        if (data.consecutiveZeroDays >= 3) {
          issues.push(`${data.consecutiveZeroDays} consecutive days with zero items`)
          severity = 'Critical'
        }
        
        if (monthlyQhhPace < 100) {
          issues.push(`Monthly pace: ${monthlyQhhPace.toFixed(0)} QHH (${((monthlyQhhPace / 200) * 100).toFixed(0)}% of 200/month target)`)
          severity = 'Critical'
        }

        // WARNING THRESHOLDS (only if not already critical)
        if (severity !== 'Critical') {
          if (qhhToItemsConversion >= 15 && qhhToItemsConversion < 20 && data.totalQhh > 0) {
            issues.push(`${qhhToItemsConversion.toFixed(1)}% QHH→Items conversion (below 20% target)`)
            severity = 'Warning'
          }
          
          if (dailyQhhAverage >= 5 && dailyQhhAverage < 8 && data.workingDays > 0) {
            issues.push(`${dailyQhhAverage.toFixed(1)} QHH/day (below 10/day target)`)
            severity = 'Warning'
          }
          
          if (itemsToSalesConversion < 40 && data.totalItems > 0) {
            issues.push(`${itemsToSalesConversion.toFixed(1)}% Items→Sales conversion (should be 40%+)`)
            severity = 'Warning'
          }
          
          if (monthlyQhhPace >= 100 && monthlyQhhPace < 150) {
            issues.push(`Monthly pace: ${monthlyQhhPace.toFixed(0)} QHH (below 200/month target)`)
            severity = 'Warning'
          }
        }

        // Only create alerts for producers with issues
        if (issues.length > 0) {
          alerts.push({
            producer_id: producerId,
            producer_name: data.name,
            severity,
            issues,
            conversion_rate: qhhToItemsConversion
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
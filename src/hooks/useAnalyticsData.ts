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

      // Fetch current period funnel via RPC
      const { data: currentFunnel, error: currentError } = await supabase.rpc('get_execution_funnel' as any, {
        from_date: currentStart,
        to_date: currentEnd,
        producer_filter: null,
        source_filter: null
      })

      if (currentError) {
        console.error('❌ Error fetching current conversion funnel via RPC:', currentError)
        throw currentError
      }

      // Fetch previous period funnel via RPC
      const { data: previousFunnel, error: previousError } = await supabase.rpc('get_execution_funnel' as any, {
        from_date: previousStart,
        to_date: previousEnd,
        producer_filter: null,
        source_filter: null
      })

      if (previousError) {
        console.error('❌ Error fetching previous conversion funnel via RPC:', previousError)
        throw previousError
      }

      // Parse current funnel stages
      const currentStages = (currentFunnel || []).map((r: any) => ({
        stage_name: String(r.stage_name),
        stage_value: Number(r.stage_value) || 0
      }))

      const currentQHH = currentStages.find(s => s.stage_name === 'QHH')?.stage_value || 0
      const currentItems = currentStages.find(s => s.stage_name === 'Items Sold')?.stage_value || 0
      const currentSales = currentStages.find(s => s.stage_name === 'Sales')?.stage_value || 0

      // Parse previous funnel stages
      const previousStages = (previousFunnel || []).map((r: any) => ({
        stage_name: String(r.stage_name),
        stage_value: Number(r.stage_value) || 0
      }))

      const previousQHH = previousStages.find(s => s.stage_name === 'QHH')?.stage_value || 0
      const previousItems = previousStages.find(s => s.stage_name === 'Items Sold')?.stage_value || 0
      const previousSales = previousStages.find(s => s.stage_name === 'Sales')?.stage_value || 0

      // Calculate conversion rates
      const currentQhhToItems = currentQHH > 0 ? (currentItems / currentQHH) * 100 : 0
      const currentItemsToSales = currentItems > 0 ? (currentSales / currentItems) * 100 : 0
      
      const previousQhhToItems = previousQHH > 0 ? (previousItems / previousQHH) * 100 : 0
      const previousItemsToSales = previousItems > 0 ? (previousSales / previousItems) * 100 : 0

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
          totalQhh: currentQHH,
          totalItems: currentItems,
          totalSales: currentSales
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
      // Query daily_entries with source breakdown for quotes
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
          ),
          daily_entry_sources(
            quotes
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
        totalQuotes: number
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

        // Sum quotes from all sources for this entry
        const entryQuotes = (entry.daily_entry_sources || []).reduce(
          (sum: number, source: { quotes: number }) => sum + (source.quotes || 0),
          0
        )

        if (!producerMap.has(producerId)) {
          producerMap.set(producerId, {
            name: producerName,
            totalQhh: 0,
            totalQuotes: 0,
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
        producer.totalQuotes += entryQuotes
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

      // Generate alerts with corrected thresholds
      // - Daily QHH: Critical <3, Warning 3-4 (framework requires 4/day for TOP)
      // - Monthly Quotes pace to 200/month (not QHH)
      // - QHH→Items conversion: Critical <15%, Warning 15-22%
      // - Removed: Items→Sales check (broken - items >= sales always due to bundling)
      const alerts: ProducerAlert[] = []

      producerMap.forEach((data, producerId) => {
        const qhhToItemsConversion = data.totalQhh > 0 ? (data.totalItems / data.totalQhh) * 100 : 0
        const dailyQhhAverage = data.workingDays > 0 ? data.totalQhh / data.workingDays : 0

        // Calculate monthly QUOTES pace (200/month target = 10/day over 20 workdays)
        const daysInPeriod = Math.max(1, data.workingDays)
        const monthlyQuotesPace = (data.totalQuotes / daysInPeriod) * 20

        const issues: string[] = []
        let severity: 'Critical' | 'Warning' | 'OK' = 'OK'

        // CRITICAL THRESHOLDS
        // QHH→Items conversion < 15% (way below 25% agency avg)
        if (qhhToItemsConversion < 15 && data.totalQhh > 0) {
          issues.push(`${qhhToItemsConversion.toFixed(1)}% close rate (should be 20%+)`)
          severity = 'Critical'
        }

        // Daily QHH < 3/day (below framework minimum of 4/day for TOP)
        if (dailyQhhAverage < 3 && data.workingDays > 0) {
          issues.push(`${dailyQhhAverage.toFixed(1)} QHH/day (framework requires 4/day)`)
          severity = 'Critical'
        }

        // 3+ consecutive days with zero items
        if (data.consecutiveZeroDays >= 3) {
          issues.push(`${data.consecutiveZeroDays} consecutive days with zero items`)
          severity = 'Critical'
        }

        // Monthly QUOTES pace < 100 (50% of 200/month target)
        if (monthlyQuotesPace < 100) {
          issues.push(`Monthly pace: ${monthlyQuotesPace.toFixed(0)} quotes (${((monthlyQuotesPace / 200) * 100).toFixed(0)}% of 200/month target)`)
          severity = 'Critical'
        }

        // WARNING THRESHOLDS (only if not already critical)
        if (severity !== 'Critical') {
          // QHH→Items conversion 15-22% (below 25% agency avg but not critical)
          if (qhhToItemsConversion >= 15 && qhhToItemsConversion < 22 && data.totalQhh > 0) {
            issues.push(`${qhhToItemsConversion.toFixed(1)}% close rate (below 25% target)`)
            severity = 'Warning'
          }

          // Daily QHH 3-4/day (at framework minimum)
          if (dailyQhhAverage >= 3 && dailyQhhAverage < 4 && data.workingDays > 0) {
            issues.push(`${dailyQhhAverage.toFixed(1)} QHH/day (at framework minimum)`)
            severity = 'Warning'
          }

          // Monthly QUOTES pace 100-150 (below 200/month target but not critical)
          if (monthlyQuotesPace >= 100 && monthlyQuotesPace < 150) {
            issues.push(`Monthly pace: ${monthlyQuotesPace.toFixed(0)} quotes (below 200/month target)`)
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


import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export interface DetectedPattern {
  id: string
  pattern_type: 'low_conversion' | 'source_failing' | 'outside_streak' | 'zero_item_streak'
  severity: 'critical' | 'warning' | 'info'
  detected_at: string
  context: {
    message: string
    entry_date?: string
    qhh_total?: number
    items_total?: number
    source_id?: string
    source_name?: string
    streak_days?: number
    streak_start?: string
    streak_end?: string
    last_item_date?: string
    total_qhh?: number
    total_qhh_during_streak?: number
    avg_metrics?: {
      avg_dials: number
      avg_talk_minutes: number
      avg_qhh: number
      avg_items: number
    }
  }
}

export interface DetectedPatternWithProducer extends DetectedPattern {
  producer_id: string
  producer_name: string
}

// Pattern display configuration
export const PATTERN_CONFIG: Record<
  DetectedPattern['pattern_type'],
  { label: string; icon: string; description: string }
> = {
  low_conversion: {
    label: 'Low Conversion',
    icon: '📉',
    description: 'High quoting activity but no sales',
  },
  source_failing: {
    label: 'Source Struggling',
    icon: '🎯',
    description: 'Lead source producing no items',
  },
  outside_streak: {
    label: 'Outside Framework',
    icon: '⚠️',
    description: 'Consecutive days outside framework',
  },
  zero_item_streak: {
    label: 'Zero Items',
    icon: '🔴',
    description: 'Consecutive days with no items sold',
  },
}

export const SEVERITY_CONFIG: Record<
  DetectedPattern['severity'],
  { label: string; className: string; badgeClassName: string }
> = {
  critical: {
    label: 'Critical',
    className: 'text-destructive',
    badgeClassName: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  warning: {
    label: 'Warning',
    className: 'text-warning',
    badgeClassName: 'bg-warning/10 text-warning border-warning/20',
  },
  info: {
    label: 'Info',
    className: 'text-muted-foreground',
    badgeClassName: 'bg-muted text-muted-foreground border-muted',
  },
}

/**
 * Fetch active patterns for a specific producer
 */
export function useProducerPatterns(producerId: string | null | undefined) {
  return useQuery({
    queryKey: ['producer-patterns', producerId],
    queryFn: async (): Promise<DetectedPattern[]> => {
      if (!producerId) return []

      const { data, error } = await supabase.rpc('get_producer_patterns', {
        p_producer_id: producerId,
      })

      if (error) {
        console.error('Error fetching producer patterns:', error)
        throw error
      }

      return (data || []) as DetectedPattern[]
    },
    enabled: !!producerId,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
  })
}

/**
 * Fetch all active patterns (for managers)
 */
export function useAllActivePatterns() {
  return useQuery({
    queryKey: ['all-active-patterns'],
    queryFn: async (): Promise<DetectedPatternWithProducer[]> => {
      const { data, error } = await supabase.rpc('get_all_active_patterns')

      if (error) {
        console.error('Error fetching all patterns:', error)
        throw error
      }

      return (data || []) as DetectedPatternWithProducer[]
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
  })
}

/**
 * Get pattern counts by severity
 */
export function getPatternCounts(patterns: DetectedPattern[]): {
  critical: number
  warning: number
  info: number
  total: number
} {
  return {
    critical: patterns.filter((p) => p.severity === 'critical').length,
    warning: patterns.filter((p) => p.severity === 'warning').length,
    info: patterns.filter((p) => p.severity === 'info').length,
    total: patterns.length,
  }
}

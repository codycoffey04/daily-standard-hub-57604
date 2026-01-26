import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SourceFailureStreak {
  producer_id: string
  producer_name: string
  source_id: string
  source_name: string
  streak_days: number
  last_item_date: string | null
  total_qhh: number
}

interface OutsideStreak {
  producer_id: string
  producer_name: string
  streak_days: number
  streak_start: string
  streak_end: string
  avg_metrics: {
    avg_dials: number
    avg_talk_minutes: number
    avg_qhh: number
    avg_items: number
  }
}

interface ZeroItemStreak {
  producer_id: string
  producer_name: string
  streak_days: number
  streak_start: string
  streak_end: string
  total_qhh_during_streak: number
}

interface LowConversionEntry {
  producer_id: string
  producer_name: string
  entry_date: string
  qhh_total: number
  items_total: number
}

interface FailingZip {
  producer_id: string
  producer_name: string
  zip_code: string
  quotes: number
  sales: number
}

interface DetectedPattern {
  producer_id: string
  pattern_type: 'low_conversion' | 'source_failing' | 'outside_streak' | 'zero_item_streak' | 'zip_failing'
  severity: 'critical' | 'warning' | 'info'
  context: Record<string, unknown>
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const startTime = Date.now()

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const patternsToInsert: DetectedPattern[] = []

    // ==================
    // 1. LOW CONVERSION: High QHH + 0 items yesterday
    // ==================
    console.log('Checking low conversion patterns...')

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const { data: lowConversionEntries, error: lcError } = await supabase
      .from('daily_entries')
      .select(`
        producer_id,
        entry_date,
        qhh_total,
        items_total,
        producers!inner(display_name, active)
      `)
      .eq('entry_date', yesterdayStr)
      .gt('qhh_total', 3) // QHH > 3 (framework requires 4 for TOP)
      .eq('items_total', 0)
      .eq('producers.active', true)

    if (lcError) {
      console.error('Error fetching low conversion entries:', lcError)
    } else if (lowConversionEntries) {
      for (const entry of lowConversionEntries as LowConversionEntry[]) {
        patternsToInsert.push({
          producer_id: entry.producer_id,
          pattern_type: 'low_conversion',
          severity: 'warning',
          context: {
            entry_date: entry.entry_date,
            qhh_total: entry.qhh_total,
            items_total: entry.items_total,
            message: `${entry.qhh_total} QHH quoted but 0 items sold on ${entry.entry_date}`
          }
        })
      }
      console.log(`Found ${lowConversionEntries.length} low conversion patterns`)
    }

    // ==================
    // 2. SOURCE FAILING: Same source 0 items for 3+ consecutive days
    // ==================
    console.log('Checking source failure streaks...')

    const { data: sourceStreaks, error: sfError } = await supabase
      .rpc('get_source_failure_streaks', { p_lookback_days: 14 })

    if (sfError) {
      console.error('Error fetching source failure streaks:', sfError)
    } else if (sourceStreaks) {
      for (const streak of sourceStreaks as SourceFailureStreak[]) {
        // 5+ days = critical, 3-4 days = warning
        const severity = streak.streak_days >= 5 ? 'critical' : 'warning'

        patternsToInsert.push({
          producer_id: streak.producer_id,
          pattern_type: 'source_failing',
          severity,
          context: {
            source_id: streak.source_id,
            source_name: streak.source_name,
            streak_days: streak.streak_days,
            last_item_date: streak.last_item_date,
            total_qhh: streak.total_qhh,
            message: `${streak.source_name}: ${streak.streak_days} days with 0 items (${streak.total_qhh} QHH quoted)`
          }
        })
      }
      console.log(`Found ${sourceStreaks.length} source failure streaks`)
    }

    // ==================
    // 3. OUTSIDE STREAK: 3+ consecutive OUTSIDE framework days
    // ==================
    console.log('Checking outside framework streaks...')

    const { data: outsideStreaks, error: osError } = await supabase
      .rpc('get_outside_streaks', { p_lookback_days: 14 })

    if (osError) {
      console.error('Error fetching outside streaks:', osError)
    } else if (outsideStreaks) {
      for (const streak of outsideStreaks as OutsideStreak[]) {
        // 5+ days = critical, 3-4 days = warning
        const severity = streak.streak_days >= 5 ? 'critical' : 'warning'

        patternsToInsert.push({
          producer_id: streak.producer_id,
          pattern_type: 'outside_streak',
          severity,
          context: {
            streak_days: streak.streak_days,
            streak_start: streak.streak_start,
            streak_end: streak.streak_end,
            avg_metrics: streak.avg_metrics,
            message: `${streak.streak_days} consecutive OUTSIDE days (${streak.streak_start} to ${streak.streak_end})`
          }
        })
      }
      console.log(`Found ${outsideStreaks.length} outside streaks`)
    }

    // ==================
    // 4. ZERO ITEM STREAK: 3+ consecutive 0-item days
    // ==================
    console.log('Checking zero item streaks...')

    const { data: zeroItemStreaks, error: ziError } = await supabase
      .rpc('get_zero_item_streaks', { p_lookback_days: 14 })

    if (ziError) {
      console.error('Error fetching zero item streaks:', ziError)
    } else if (zeroItemStreaks) {
      for (const streak of zeroItemStreaks as ZeroItemStreak[]) {
        // 5+ days = critical, 3-4 days = warning
        const severity = streak.streak_days >= 5 ? 'critical' : 'warning'

        patternsToInsert.push({
          producer_id: streak.producer_id,
          pattern_type: 'zero_item_streak',
          severity,
          context: {
            streak_days: streak.streak_days,
            streak_start: streak.streak_start,
            streak_end: streak.streak_end,
            total_qhh_during_streak: streak.total_qhh_during_streak,
            message: `${streak.streak_days} consecutive days with 0 items (${streak.total_qhh_during_streak} QHH quoted during streak)`
          }
        })
      }
      console.log(`Found ${zeroItemStreaks.length} zero item streaks`)
    }

    // ==================
    // 5. ZIP FAILING: 8+ quotes with 0 sales in rolling 30 days
    // ==================
    console.log('Checking failing ZIPs...')

    const { data: failingZips, error: fzError } = await supabase
      .rpc('get_failing_zips_v2', { p_lookback_days: 30 })

    if (fzError) {
      console.error('Error fetching failing ZIPs:', fzError)
    } else if (failingZips) {
      for (const zip of failingZips as FailingZip[]) {
        patternsToInsert.push({
          producer_id: zip.producer_id,
          pattern_type: 'zip_failing',
          severity: 'warning',
          context: {
            zip_code: zip.zip_code,
            quotes: zip.quotes,
            sales: zip.sales,
            message: `ZIP ${zip.zip_code}: ${zip.quotes} quotes, 0 sales — consider avoiding this area`
          }
        })
      }
      console.log(`Found ${failingZips.length} failing ZIPs`)
    }

    // ==================
    // 6. DEDUPE: Check for existing active patterns
    // ==================
    console.log('Deduplicating against existing patterns...')

    const { data: existingPatterns, error: epError } = await supabase
      .from('detected_patterns')
      .select('producer_id, pattern_type, context')
      .is('resolved_at', null)

    if (epError) {
      console.error('Error fetching existing patterns:', epError)
    }

    const existingKeys = new Set(
      (existingPatterns || []).map(p => {
        // Create a unique key based on pattern type and key context fields
        const ctx = p.context as Record<string, unknown>
        if (p.pattern_type === 'source_failing') {
          return `${p.producer_id}:${p.pattern_type}:${ctx.source_id}`
        }
        if (p.pattern_type === 'low_conversion') {
          return `${p.producer_id}:${p.pattern_type}:${ctx.entry_date}`
        }
        if (p.pattern_type === 'zip_failing') {
          return `${p.producer_id}:${p.pattern_type}:${ctx.zip_code}`
        }
        // For streaks, use streak_end date to identify the same streak
        return `${p.producer_id}:${p.pattern_type}:${ctx.streak_end || ctx.entry_date}`
      })
    )

    const newPatterns = patternsToInsert.filter(p => {
      const ctx = p.context
      let key: string
      if (p.pattern_type === 'source_failing') {
        key = `${p.producer_id}:${p.pattern_type}:${ctx.source_id}`
      } else if (p.pattern_type === 'low_conversion') {
        key = `${p.producer_id}:${p.pattern_type}:${ctx.entry_date}`
      } else if (p.pattern_type === 'zip_failing') {
        key = `${p.producer_id}:${p.pattern_type}:${ctx.zip_code}`
      } else {
        key = `${p.producer_id}:${p.pattern_type}:${ctx.streak_end || ctx.entry_date}`
      }
      return !existingKeys.has(key)
    })

    console.log(`${patternsToInsert.length} total patterns, ${newPatterns.length} are new`)

    // ==================
    // 7. INSERT NEW PATTERNS
    // ==================
    if (newPatterns.length > 0) {
      const { error: insertError } = await supabase
        .from('detected_patterns')
        .insert(newPatterns)

      if (insertError) {
        console.error('Error inserting patterns:', insertError)
        throw new Error(`Failed to insert patterns: ${insertError.message}`)
      }

      console.log(`Inserted ${newPatterns.length} new patterns`)
    }

    // ==================
    // 8. AUTO-RESOLVE OLD PATTERNS (7+ days old)
    // ==================
    console.log('Auto-resolving old patterns...')

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: resolvedPatterns, error: resolveError } = await supabase
      .from('detected_patterns')
      .update({
        resolved_at: new Date().toISOString(),
        auto_resolved: true
      })
      .is('resolved_at', null)
      .lt('detected_at', sevenDaysAgo.toISOString())
      .select('id')

    if (resolveError) {
      console.error('Error auto-resolving patterns:', resolveError)
    } else {
      console.log(`Auto-resolved ${resolvedPatterns?.length || 0} old patterns`)
    }

    const duration = Date.now() - startTime

    return new Response(
      JSON.stringify({
        success: true,
        patternsDetected: patternsToInsert.length,
        newPatternsInserted: newPatterns.length,
        patternsAutoResolved: resolvedPatterns?.length || 0,
        durationMs: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in detect-patterns:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

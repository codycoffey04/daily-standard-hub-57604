import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  emailMetricsId: string
  emailType: 'weekly' | 'monthly'
  announcements?: string
  compareWithPreviousPeriod?: boolean
}

interface ProducerProductionMetrics {
  sales: number
  items: number
  premium: number
  policies: number
}

interface TDSActivityMetrics {
  qhh: number
  quotes: number
  dials: number
  talk_minutes: number
}

interface LeadSourceMetrics {
  id: string
  source_name_raw: string
  mapped_source_name: string | null
  items: number
  premium: number
  policies: number
  sales: number
  points: number
  is_csr_source: boolean
  attributed_to: string | null
}

interface ComparisonData {
  team_items_delta: number
  team_items_pct_change: number
  team_premium_delta: number
  team_premium_pct_change: number
  team_sales_delta: number
  team_sales_pct_change: number
  team_qhh_delta: number
  team_qhh_pct_change: number
  producer_deltas: Record<string, {
    items_delta: number
    items_pct: number
    premium_delta: number
    premium_pct: number
  }>
}

interface EmailTemplateSettings {
  weekly: {
    sections: string[]
    emojis: Record<string, string>
    table_style: Record<string, string>
  }
  monthly: {
    sections: string[]
  }
  signature: string
  closing_phrase: string
}

interface VCTargets {
  GA: number
  AL: number
  focus_state: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const startTime = Date.now()

    // Get request body
    const { emailMetricsId, emailType, announcements, compareWithPreviousPeriod = true }: RequestBody = await req.json()

    if (!emailMetricsId || !emailType) {
      throw new Error('Missing required fields: emailMetricsId and emailType')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch email_metrics record
    const { data: metrics, error: metricsError } = await supabase
      .from('email_metrics')
      .select('*')
      .eq('id', emailMetricsId)
      .single()

    if (metricsError || !metrics) {
      throw new Error(`Email metrics not found: ${emailMetricsId}`)
    }

    // Fetch lead source metrics
    const { data: leadSources, error: leadSourcesError } = await supabase
      .from('email_lead_source_metrics')
      .select('*')
      .eq('email_metrics_id', emailMetricsId)
      .order('items', { ascending: false })

    if (leadSourcesError) {
      console.error('Error fetching lead sources:', leadSourcesError)
    }

    // Fetch configuration
    const { data: configs, error: configsError } = await supabase
      .from('coaching_framework_config')
      .select('config_type, config_data')
      .in('config_type', ['email_vc_targets', 'email_csr_tiers', 'email_template_settings', 'email_source_mappings'])
      .eq('active', true)

    if (configsError) {
      console.error('Error fetching configs:', configsError)
    }

    const vcTargets = configs?.find(c => c.config_type === 'email_vc_targets')?.config_data as VCTargets | undefined
    const csrTiers = configs?.find(c => c.config_type === 'email_csr_tiers')?.config_data
    const templateSettings = configs?.find(c => c.config_type === 'email_template_settings')?.config_data as EmailTemplateSettings | undefined

    // Calculate comparison data if previous period exists
    let comparisonData: ComparisonData | null = null
    let previousMetrics = null

    if (compareWithPreviousPeriod) {
      const prevPeriodStart = new Date(metrics.period_start)
      if (emailType === 'weekly') {
        prevPeriodStart.setDate(prevPeriodStart.getDate() - 7)
      } else {
        prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 1)
      }

      const { data: prevData } = await supabase
        .from('email_metrics')
        .select('*')
        .eq('period_type', emailType)
        .eq('period_start', prevPeriodStart.toISOString().split('T')[0])
        .maybeSingle()

      if (prevData) {
        previousMetrics = prevData
        const calcDelta = (curr: number, prev: number) => ({
          delta: curr - prev,
          pct: prev > 0 ? ((curr - prev) / prev) * 100 : 0
        })

        comparisonData = {
          team_items_delta: (metrics.team_items || 0) - (prevData.team_items || 0),
          team_items_pct_change: prevData.team_items > 0 ? ((metrics.team_items - prevData.team_items) / prevData.team_items) * 100 : 0,
          team_premium_delta: Number(metrics.team_premium || 0) - Number(prevData.team_premium || 0),
          team_premium_pct_change: Number(prevData.team_premium) > 0 ? ((Number(metrics.team_premium) - Number(prevData.team_premium)) / Number(prevData.team_premium)) * 100 : 0,
          team_sales_delta: (metrics.team_sales || 0) - (prevData.team_sales || 0),
          team_sales_pct_change: prevData.team_sales > 0 ? ((metrics.team_sales - prevData.team_sales) / prevData.team_sales) * 100 : 0,
          team_qhh_delta: (metrics.team_qhh || 0) - (prevData.team_qhh || 0),
          team_qhh_pct_change: prevData.team_qhh > 0 ? ((metrics.team_qhh - prevData.team_qhh) / prevData.team_qhh) * 100 : 0,
          producer_deltas: {}
        }

        // Calculate per-producer deltas
        const currentProducers = metrics.producer_metrics as Record<string, ProducerProductionMetrics>
        const prevProducers = prevData.producer_metrics as Record<string, ProducerProductionMetrics>

        for (const [key, curr] of Object.entries(currentProducers)) {
          const prev = prevProducers[key]
          if (prev) {
            comparisonData.producer_deltas[key] = {
              items_delta: curr.items - prev.items,
              items_pct: prev.items > 0 ? ((curr.items - prev.items) / prev.items) * 100 : 0,
              premium_delta: curr.premium - prev.premium,
              premium_pct: prev.premium > 0 ? ((curr.premium - prev.premium) / prev.premium) * 100 : 0
            }
          }
        }
      }
    }

    // Calculate VC pacing
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const totalWorkdays = getWorkdaysInMonth(monthStart, monthEnd)
    const elapsedWorkdays = getWorkdaysBetween(monthStart, today)

    const vcTarget = vcTargets?.[vcTargets?.focus_state as keyof VCTargets] || 76
    const expectedItems = (vcTarget * elapsedWorkdays / totalWorkdays)
    const vcPace = metrics.team_items > 0 ? (metrics.team_items / expectedItems) * 100 : 0
    const projectedItems = elapsedWorkdays > 0 ? (metrics.team_items / elapsedWorkdays) * totalWorkdays : 0

    // Build producer data for email
    const producerMetrics = metrics.producer_metrics as Record<string, ProducerProductionMetrics>
    const tdsActivity = metrics.tds_activity_metrics as Record<string, TDSActivityMetrics>

    // Merge production and TDS data
    const producerData = Object.entries(producerMetrics).map(([name, prod]) => {
      const activity = tdsActivity?.[name] || { qhh: 0, quotes: 0, dials: 0, talk_minutes: 0 }
      const closeRate = activity.qhh > 0 ? (prod.sales / activity.qhh) * 100 : 0
      const delta = comparisonData?.producer_deltas?.[name]

      return {
        name,
        ...prod,
        qhh: activity.qhh,
        quotes: activity.quotes,
        dials: activity.dials,
        talk_minutes: activity.talk_minutes,
        close_rate: closeRate,
        items_delta: delta?.items_delta || 0,
        items_pct: delta?.items_pct || 0
      }
    }).sort((a, b) => b.items - a.items)

    // Build lead source data
    const leadSourceData = (leadSources as LeadSourceMetrics[] || []).map(s => ({
      name: s.mapped_source_name || s.source_name_raw,
      items: s.items,
      premium: s.premium,
      sales: s.sales,
      is_csr: s.is_csr_source,
      attributed_to: s.attributed_to
    }))

    // CSR totals
    const csrSources = leadSourceData.filter(s => s.is_csr)
    const csrTotals = {
      items: csrSources.reduce((sum, s) => sum + s.items, 0),
      premium: csrSources.reduce((sum, s) => sum + s.premium, 0)
    }

    // Build Claude prompt
    const emojis = templateSettings?.weekly?.emojis || { up: '🔺', down: '🔻', warning: '⚠️', success: '✅', fire: '🔥' }

    const systemPrompt = `You are an expert sales manager at Coffey Agencies, an Allstate-exclusive insurance agency.
You write concise, data-driven team update emails that motivate producers while being honest about performance.

Your writing style:
- Direct and actionable, not fluffy
- Use specific numbers and percentages
- Celebrate wins but address gaps honestly
- Rotate coaching pressure - don't hammer the same person every week
- Push close rate if volume is fine, push volume if close rate is fine

Email formatting:
- Use Outlook-compatible HTML tables (inline styles, no CSS classes)
- Table headers: blue background (#1e40af), white text
- Alternating row colors for readability
- Keep emojis to: ${emojis.up} (up), ${emojis.down} (down), ${emojis.warning} (warning), ${emojis.success} (success), ${emojis.fire} (fire)
- Sign off with "${templateSettings?.closing_phrase || 'LFG.'} ${emojis.fire}" and "${templateSettings?.signature || 'Cody'}"`

    const weekLabel = emailType === 'weekly'
      ? `Week of ${new Date(metrics.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : `${new Date(metrics.period_start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`

    const userPrompt = `## Task
Generate a ${emailType} team update email for Coffey Agencies.

## Period
${weekLabel} (${metrics.period_start} to ${metrics.period_end})

## Team Production Data (AgencyZoom - Source of Truth)
| Producer | Sales | Items | Premium | Policies |${comparisonData ? ' Items Delta |' : ''}
|----------|-------|-------|---------|----------|${comparisonData ? '-------------|' : ''}
${producerData.map(p => `| ${p.name} | ${p.sales} | ${p.items} | $${p.premium.toLocaleString()} | ${p.policies} |${comparisonData ? ` ${p.items_delta >= 0 ? '+' : ''}${p.items_delta} (${p.items_pct >= 0 ? '+' : ''}${p.items_pct.toFixed(1)}%) |` : ''}`).join('\n')}
| **TEAM** | ${metrics.team_sales} | ${metrics.team_items} | $${Number(metrics.team_premium).toLocaleString()} | ${metrics.team_policies} |${comparisonData ? ` ${comparisonData.team_items_delta >= 0 ? '+' : ''}${comparisonData.team_items_delta} (${comparisonData.team_items_pct_change >= 0 ? '+' : ''}${comparisonData.team_items_pct_change.toFixed(1)}%) |` : ''}

## TDS Activity Data
| Producer | QHH | Quotes | Dials | Talk Time | Close Rate |
|----------|-----|--------|-------|-----------|------------|
${producerData.map(p => `| ${p.name} | ${p.qhh} | ${p.quotes} | ${p.dials} | ${Math.floor(p.talk_minutes / 60)}h ${p.talk_minutes % 60}m | ${p.close_rate.toFixed(1)}% |`).join('\n')}
| **TEAM** | ${metrics.team_qhh} | ${metrics.team_quotes} | - | - | ${metrics.team_qhh > 0 ? ((metrics.team_sales / metrics.team_qhh) * 100).toFixed(1) : 0}% |

## ${vcTargets?.focus_state || 'GA'} VC Pacing (Target: ${vcTarget} items)
- Current Items: ${metrics.team_items}
- Expected by now: ${expectedItems.toFixed(0)} items
- VC Pace: ${vcPace.toFixed(0)}%
- Projected finish: ${projectedItems.toFixed(0)} items
- Gap: ${(vcTarget - projectedItems).toFixed(0)} items to close
- Workdays remaining: ${totalWorkdays - elapsedWorkdays}

## Lead Source Performance (Ranked by Items)
${leadSourceData.length > 0 ? leadSourceData.map((s, i) => `${i + 1}. ${s.name}: ${s.items} items, $${s.premium.toLocaleString()} premium${s.is_csr ? ' [CSR]' : ''}`).join('\n') : 'No lead source data available'}

## CSR Performance
${csrSources.length > 0 ? `CSR Referrals: ${csrTotals.items} items, $${csrTotals.premium.toLocaleString()} premium` : 'No CSR data'}

${announcements ? `## Announcements to Include\n${announcements}` : ''}

## Required Email Sections (${emailType})
${emailType === 'weekly' ? `
1. Opening hook - 1-2 sentences, honest not fluffy, set the tone
2. Production table - Items, Premium, Sales, Policies by producer with WoW deltas (${emojis.up}/${emojis.down})
3. ${vcTargets?.focus_state || 'GA'} VC Pacing - Current vs ${vcTarget}-item target, gap, projection
4. Quotes & Close Rate table - By producer, ranked by close rate, flag best performer
5. Lead Source Performance table - Ranked by Items, highlight top (${emojis.fire}), flag concerning (${emojis.warning})
6. Coaching Notes - 2-3 sentences per producer based on their metrics vs team avg
7. CSR Section - If CSR data present, highlight CSR referral production
8. Announcements - Include any from the announcements section above
9. Week Focus - Clear expectations for coming week, bullet list
10. Closing - "${templateSettings?.closing_phrase || 'LFG.'} ${emojis.fire}" with signature` :
`
1. Opening hook - Set the tone for the month
2. Monthly production summary - Team totals with MoM comparison
3. VC Final Status - Did we hit target? Celebrate or address gap
4. Producer rankings - Full month performance
5. Lead Source Analysis - What worked, what didn't
6. CSR Bonus Status - Who qualified for which tier
7. Month highlights - Best week, standout performances
8. Next month focus - Set expectations
9. Closing - Motivational close with signature`}

## Output Format
Return a JSON object with exactly this structure:
{
  "subject_line": "<email subject line>",
  "html_content": "<complete Outlook-compatible HTML email>",
  "markdown_content": "<plain markdown version of the email>"
}

For html_content:
- Use inline styles on all elements (no CSS classes)
- Tables must have: border-collapse: collapse; width: 100%
- Table headers: background-color: #1e40af; color: white; padding: 8px; text-align: left
- Table cells: padding: 8px; border: 1px solid #e5e7eb
- Alternating rows: background-color: #f3f4f6 for odd rows
- Bold the team total row
- Use <strong> for emphasis, not <b>

IMPORTANT: Return ONLY the JSON object, no additional text or markdown code blocks.`

    // Call Claude API
    console.log(`Generating ${emailType} email for period ${metrics.period_start}`)

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ],
        system: systemPrompt
      })
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`)
    }

    const claudeData = await claudeResponse.json()
    const responseText = claudeData.content[0].text

    // Parse Claude response
    let parsedResponse: { subject_line: string; html_content: string; markdown_content: string }
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      parsedResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText)
      throw new Error(`Failed to parse Claude response: ${parseError}`)
    }

    // Calculate generation metrics
    const generationDuration = Date.now() - startTime
    const tokensUsed = claudeData.usage?.input_tokens + claudeData.usage?.output_tokens || 0

    // Check for existing email
    const { data: existingEmail } = await supabase
      .from('email_updates')
      .select('id')
      .eq('email_type', emailType)
      .eq('period_start', metrics.period_start)
      .maybeSingle()

    // Save to email_updates table
    const emailData = {
      email_metrics_id: emailMetricsId,
      email_type: emailType,
      period_start: metrics.period_start,
      period_end: metrics.period_end,
      subject_line: parsedResponse.subject_line,
      html_content: parsedResponse.html_content,
      markdown_content: parsedResponse.markdown_content,
      announcements: announcements || null,
      previous_period_id: previousMetrics?.id || null,
      comparison_data: comparisonData,
      model_used: 'claude-sonnet-4-20250514',
      tokens_used: tokensUsed,
      generation_duration_ms: generationDuration
    }

    let emailId: string

    if (existingEmail) {
      const { error: updateError } = await supabase
        .from('email_updates')
        .update(emailData)
        .eq('id', existingEmail.id)

      if (updateError) throw new Error(`Failed to update email: ${updateError.message}`)
      emailId = existingEmail.id
    } else {
      const { data: newEmail, error: insertError } = await supabase
        .from('email_updates')
        .insert(emailData)
        .select('id')
        .single()

      if (insertError) throw new Error(`Failed to create email: ${insertError.message}`)
      emailId = newEmail.id
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId,
        subject_line: parsedResponse.subject_line,
        html_content: parsedResponse.html_content,
        markdown_content: parsedResponse.markdown_content,
        tokensUsed,
        generationDurationMs: generationDuration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating email:', error)

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

// Helper functions for workday calculations
function getWorkdaysInMonth(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  while (current <= end) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

function getWorkdaysBetween(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  while (current <= end) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

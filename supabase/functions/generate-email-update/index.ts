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

interface VCTargets {
  GA: number
  AL: number
  focus_state: string
  monthly_multiplier?: number
}

interface CSRTier {
  min: number
  max: number
  bonus: number
  label: string
}

interface CSRTiersConfig {
  tiers: CSRTier[]
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
    const csrTiersConfig = configs?.find(c => c.config_type === 'email_csr_tiers')?.config_data as CSRTiersConfig | undefined

    // Fetch previous week's email for coaching rotation context
    let previousEmailContent: string | null = null
    const prevEmailStart = new Date(metrics.period_start)
    if (emailType === 'weekly') {
      prevEmailStart.setDate(prevEmailStart.getDate() - 7)
    } else {
      prevEmailStart.setMonth(prevEmailStart.getMonth() - 1)
    }

    const { data: prevEmail } = await supabase
      .from('email_updates')
      .select('markdown_content')
      .eq('email_type', emailType)
      .eq('period_start', prevEmailStart.toISOString().split('T')[0])
      .maybeSingle()

    if (prevEmail?.markdown_content) {
      // Extract just the coaching notes section for context
      const coachingMatch = prevEmail.markdown_content.match(/## 🧠 Coaching Notes[\s\S]*?(?=##|$)/i)
      if (coachingMatch) {
        previousEmailContent = coachingMatch[0].trim()
      }
    }

    // Calculate WoW deltas using the weekly data (not MTD minus previous MTD)
    let comparisonData: ComparisonData | null = null
    let previousMetrics = null

    // Get weekly production data for WoW deltas
    const weeklyProducerMetrics = metrics.weekly_producer_metrics as Record<string, ProducerProductionMetrics> || {}
    const weeklyTeamItems = metrics.weekly_team_items || 0
    const weeklyTeamPremium = Number(metrics.weekly_team_premium) || 0
    const weeklyTeamSales = metrics.weekly_team_sales || 0

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

        // Use weekly data for WoW comparison
        const prevWeeklyTeamItems = prevData.weekly_team_items || 0
        const prevWeeklyTeamPremium = Number(prevData.weekly_team_premium) || 0
        const prevWeeklyTeamSales = prevData.weekly_team_sales || 0
        const prevWeeklyProducers = prevData.weekly_producer_metrics as Record<string, ProducerProductionMetrics> || {}

        comparisonData = {
          team_items_delta: weeklyTeamItems - prevWeeklyTeamItems,
          team_items_pct_change: prevWeeklyTeamItems > 0 ? ((weeklyTeamItems - prevWeeklyTeamItems) / prevWeeklyTeamItems) * 100 : 0,
          team_premium_delta: weeklyTeamPremium - prevWeeklyTeamPremium,
          team_premium_pct_change: prevWeeklyTeamPremium > 0 ? ((weeklyTeamPremium - prevWeeklyTeamPremium) / prevWeeklyTeamPremium) * 100 : 0,
          team_sales_delta: weeklyTeamSales - prevWeeklyTeamSales,
          team_sales_pct_change: prevWeeklyTeamSales > 0 ? ((weeklyTeamSales - prevWeeklyTeamSales) / prevWeeklyTeamSales) * 100 : 0,
          team_qhh_delta: (metrics.team_qhh || 0) - (prevData.team_qhh || 0),
          team_qhh_pct_change: prevData.team_qhh > 0 ? ((metrics.team_qhh - prevData.team_qhh) / prevData.team_qhh) * 100 : 0,
          producer_deltas: {}
        }

        // Calculate per-producer deltas using weekly data
        for (const [key, curr] of Object.entries(weeklyProducerMetrics)) {
          const prev = prevWeeklyProducers[key]
          if (prev) {
            comparisonData.producer_deltas[key] = {
              items_delta: curr.items - prev.items,
              items_pct: prev.items > 0 ? ((curr.items - prev.items) / prev.items) * 100 : 0,
              premium_delta: curr.premium - prev.premium,
              premium_pct: prev.premium > 0 ? ((curr.premium - prev.premium) / prev.premium) * 100 : 0
            }
          } else {
            // No previous data for this producer, delta is just this week's data
            comparisonData.producer_deltas[key] = {
              items_delta: curr.items,
              items_pct: 0,
              premium_delta: curr.premium,
              premium_pct: 0
            }
          }
        }
      } else if (Object.keys(weeklyProducerMetrics).length > 0) {
        // No previous week data, but we have this week's data
        comparisonData = {
          team_items_delta: weeklyTeamItems,
          team_items_pct_change: 0,
          team_premium_delta: weeklyTeamPremium,
          team_premium_pct_change: 0,
          team_sales_delta: weeklyTeamSales,
          team_sales_pct_change: 0,
          team_qhh_delta: metrics.team_qhh || 0,
          team_qhh_pct_change: 0,
          producer_deltas: {}
        }

        for (const [key, curr] of Object.entries(weeklyProducerMetrics)) {
          comparisonData.producer_deltas[key] = {
            items_delta: curr.items,
            items_pct: 0,
            premium_delta: curr.premium,
            premium_pct: 0
          }
        }
      }
    }

    // Calculate VC pacing based on period end date
    const periodEndDate = new Date(metrics.period_end)
    const monthStart = new Date(periodEndDate.getFullYear(), periodEndDate.getMonth(), 1)
    const monthEnd = new Date(periodEndDate.getFullYear(), periodEndDate.getMonth() + 1, 0)
    const totalWorkdays = getWorkdaysInMonth(monthStart, monthEnd)
    const elapsedWorkdays = getWorkdaysBetween(monthStart, periodEndDate)
    const remainingWorkdays = totalWorkdays - elapsedWorkdays

    const vcTarget = vcTargets?.[vcTargets?.focus_state as keyof VCTargets] || 76
    // % of Target = Current Items ÷ Target (e.g., 68/76 = 89.5%)
    const pctOfTarget = vcTarget > 0 ? (metrics.team_items / vcTarget) * 100 : 0
    // Projected Finish = (Current Items ÷ Days Elapsed) × Total Workdays
    const projectedItems = elapsedWorkdays > 0 ? (metrics.team_items / elapsedWorkdays) * totalWorkdays : 0
    // On Pace = Projected Finish ≥ Target
    const onPace = projectedItems >= vcTarget
    const itemsNeeded = Math.max(0, vcTarget - metrics.team_items)
    const dailyItemsNeeded = remainingWorkdays > 0 ? itemsNeeded / remainingWorkdays : 0

    // Build producer data for email
    const producerMetrics = metrics.producer_metrics as Record<string, ProducerProductionMetrics>
    const tdsActivity = metrics.tds_activity_metrics as Record<string, TDSActivityMetrics>

    // Calculate quote pace (target: 200/month per producer)
    const MONTHLY_QUOTE_TARGET = 200
    const expectedQuotesPerProducer = (MONTHLY_QUOTE_TARGET * elapsedWorkdays / totalWorkdays)

    // Merge production and TDS data
    const producerData = Object.entries(producerMetrics).map(([name, prod]) => {
      const activity = tdsActivity?.[name] || { qhh: 0, quotes: 0, dials: 0, talk_minutes: 0 }
      const closeRate = activity.qhh > 0 ? (prod.sales / activity.qhh) * 100 : 0
      const delta = comparisonData?.producer_deltas?.[name]
      const pipeline = activity.qhh - prod.sales // Households quoted but not sold
      const quotePace = expectedQuotesPerProducer > 0 ? (activity.quotes / expectedQuotesPerProducer) * 100 : 0
      const projectedQuotes = elapsedWorkdays > 0 ? (activity.quotes / elapsedWorkdays) * totalWorkdays : 0

      return {
        name,
        ...prod,
        qhh: activity.qhh,
        quotes: activity.quotes,
        dials: activity.dials,
        talk_minutes: activity.talk_minutes,
        close_rate: closeRate,
        items_delta: delta?.items_delta || 0,
        items_pct: delta?.items_pct || 0,
        pipeline,
        quote_pace: quotePace,
        projected_quotes: projectedQuotes
      }
    }).sort((a, b) => b.items - a.items)

    // Build lead source data with sales data for conversion
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

    // Build the full framework system prompt
    const systemPrompt = `You are generating a weekly team email for Coffey Agencies, an Allstate-exclusive insurance agency with locations in Centre, AL and Rome, GA. The 2026 focus is Georgia production.

## Your Role
You write like a direct, no-BS agency owner who cares about results but also genuinely wants the team to succeed. You're encouraging but not soft. You use data to make points, not generalities.

## Email Framework — Follow This Structure Exactly

### 1. Opening Hook (1-2 sentences)
- Set the tone for the week
- Be honest, not fluffy
- Reference where we stand (items, VC pace, momentum)
- If it's a big moment (end of month, Q1, etc.), acknowledge the stakes

### 2. Production Table
- Columns: Producer, Items, Premium, Policies, Sales
- Include WoW deltas with 🔺/🔻 below the table
- Bold the Team total row
- Note: Data comes from AgencyZoom (source of truth)

### 3. GA VC Pacing Section
- Target: ${vcTarget} items (Georgia 2026 baseline)
- Show: Current items, Projected finish, Gap
- Calculate days remaining in month
- Calculate daily items needed to hit target
- Be direct about whether we're on pace or not

### 4. Quotes & Close Rate Table
- Columns: Producer, QHH, Quotes, Sales, Close Rate
- Close Rate = Sales ÷ QHH (AgencyZoom Sales, TDS QHH)
- Flag best close rate with ✅
- Bold Team total row
- Add context below: who's leading in efficiency vs volume
- Note quote pace vs 200/month target

### 5. Lead Source Performance Table
- Columns: Source, Items, Premium, Sales
- Rank by Items (highest first)
- Combine sources per mapping rules (e.g., "Crystal" + "Crystal Brozio" = "Crystal (CSR)")
- Highlight top source with 🔥
- Flag concerning sources with ⚠️

After the table, add insights:
- Call out what's working (referrals, cross-sales, CSR production)
- Call out what's not (Net Leads low conversion, etc.)
- Reference specific conversion rates when relevant
- Compare high-value sources (referrals close at X%) vs low-value (Net Leads close at Y%)

### 6. Coaching Notes (AI-Generated)
- 2-3 sentences per producer
- Reference specific numbers from their data
- Be constructive but direct
- If volume is good but close rate is low → push follow-up/conversion
- If close rate is good but volume is low → push more quotes
- Calculate opportunities sitting in pipeline (QHH - Sales = households that haven't bought)
- IMPORTANT: Don't hammer the same producer two weeks in a row — rotate pressure

### 7. CSR Section (if CSR data present)
- Highlight CSR referral production
- Compare to other sources ("more than Net Leads, more than Walk-Ins")
- Call out specific CSRs doing well
- Call out CSRs who should step up (tactfully)
- Reference incentive tier requirements:
  - 🥇 Top: $2,000 — 5 ALR, 5 Referrals, 25 Cross-Sell Quotes, 5 Reviews
  - 🥈 Mid: $1,250 — 3 ALR, 3 Referrals, 15 Cross-Sell Quotes, 3 Reviews
  - 🥉 Bottom: $750 — 2 ALR, 2 Referrals, 10 Cross-Sell Quotes, 2 Reviews

### 8. Life Insurance Update (if mentioned in announcements)
- Current life apps submitted/pending
- Reminder: Need 3 life apps issued by 2/28/2026 for Allstate Q1 promo
- Encourage team to send life opportunities to Aleeah

### 9. Announcements (from additional context)
- Policy changes, personnel updates, promos
- Google Ads updates
- Anything else provided in context

### 10. Week Focus Section
- Bullet list of 6-8 priorities
- Tie back to gaps identified in the data
- Be specific (e.g., "Kimberly: 20 quotes this week")
- Always include: referrals, cross-sell, follow-ups, Google reviews

### 11. Closing
- Callback to the narrative (if we started behind, note progress)
- Reinforce the goal
- End with: LFG. 🔥
- Sign with: — Cody

## Formatting Rules

- Use tables for data (Production, Quotes, Lead Sources, CSR Tiers)
- Use prose for insights and coaching
- Emojis sparingly: 🔺🔻⚠️✅🔥
- WoW deltas format: 🔺 Maria +13 items WoW | 🔺 Kimberly +18 items WoW
- Bold important numbers and names
- Keep paragraphs short (2-3 sentences max)
- No fluff, no corporate speak

## Rules — Do Not Break

1. NEVER invent numbers — only use data provided
2. NEVER hammer the same producer two weeks in a row
3. NEVER spotlight high close rate if quote volume is very low
4. ALWAYS calculate Close Rate as: AgencyZoom Sales ÷ TDS QHH
5. ALWAYS reference the ${vcTarget}-item GA VC target
6. ALWAYS include Lead Source insights when data is provided
7. Ignore Revenue column from AgencyZoom (known to be inaccurate)

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

    // Build week/month label
    const periodEndDateObj = new Date(metrics.period_end)
    const weekLabel = emailType === 'weekly'
      ? `Week of ${new Date(metrics.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (as of ${periodEndDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
      : `${new Date(metrics.period_start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`

    // Build WoW deltas string using weekly data
    const weeklyWowDeltasStr = Object.entries(weeklyProducerMetrics)
      .map(([name, data]) => {
        const delta = comparisonData?.producer_deltas?.[name]
        const itemsDelta = delta?.items_delta || data.items
        return `${itemsDelta >= 0 ? '🔺' : '🔻'} ${name} ${itemsDelta >= 0 ? '+' : ''}${itemsDelta} items WoW`
      })
      .join(' | ')

    // Build user prompt with all data
    const userPrompt = `## Task
Generate a ${emailType} team update email for Coffey Agencies.

## Period
${weekLabel} (${metrics.period_start} to ${metrics.period_end})

## MTD Team Production Data (AgencyZoom - Source of Truth for VC Pacing)
| Producer | Items MTD | Premium MTD | Policies | Sales |
|----------|-----------|-------------|----------|-------|
${producerData.map(p => `| ${p.name} | ${p.items} | $${p.premium.toLocaleString()} | ${p.policies} | ${p.sales} |`).join('\n')}
| **TEAM** | **${metrics.team_items}** | **$${Number(metrics.team_premium).toLocaleString()}** | **${metrics.team_policies}** | **${metrics.team_sales}** |

## This Week's Production (For WoW Deltas)
| Producer | Items This Week | Premium This Week |
|----------|-----------------|-------------------|
${Object.entries(weeklyProducerMetrics).map(([name, data]) => `| ${name} | ${data.items} | $${data.premium.toLocaleString()} |`).join('\n') || '| No weekly data | - | - |'}
| **TEAM** | **${weeklyTeamItems}** | **$${weeklyTeamPremium.toLocaleString()}** |

${comparisonData && weeklyTeamItems > 0 ? `**WoW Deltas (This Week vs Last Week):** ${weeklyWowDeltasStr}

Team WoW: ${comparisonData.team_items_delta >= 0 ? '+' : ''}${comparisonData.team_items_delta} items (${comparisonData.team_items_pct_change >= 0 ? '+' : ''}${comparisonData.team_items_pct_change.toFixed(1)}%)` : ''}

## TDS Activity Data (Quotes & Close Rate)
| Producer | QHH | Quotes | Sales | Close Rate | Pipeline (Unsold) |
|----------|-----|--------|-------|------------|-------------------|
${producerData.map(p => `| ${p.name} | ${p.qhh} | ${p.quotes} | ${p.sales} | ${p.close_rate.toFixed(1)}% | ${p.pipeline} households |`).join('\n')}
| **TEAM** | **${metrics.team_qhh}** | **${metrics.team_quotes}** | **${metrics.team_sales}** | **${metrics.team_qhh > 0 ? ((metrics.team_sales / metrics.team_qhh) * 100).toFixed(1) : 0}%** | **${metrics.team_qhh - metrics.team_sales}** |

## Quote Pace (Target: 200/month per producer)
| Producer | Quotes MTD | Projected | Status |
|----------|------------|-----------|--------|
${producerData.map(p => `| ${p.name} | ${p.quotes} | ${p.projected_quotes.toFixed(0)} | ${p.quote_pace >= 90 ? '✅ On track' : '⚠️ Behind'} |`).join('\n')}

## ${vcTargets?.focus_state || 'GA'} VC Pacing (Target: ${vcTarget} items)
- Current Items: ${metrics.team_items}
- % of Target: ${pctOfTarget.toFixed(1)}% (${metrics.team_items}/${vcTarget})
- Projected finish: ${projectedItems.toFixed(0)} items
- Items needed: ${itemsNeeded} more
- Workdays elapsed: ${elapsedWorkdays} of ${totalWorkdays}
- Workdays remaining: ${remainingWorkdays}
- Daily items needed: ${dailyItemsNeeded.toFixed(1)}/day

${onPace ? '✅ ON PACE to hit VC' : `⚠️ BEHIND PACE — need ${itemsNeeded} items in ${remainingWorkdays} days (${dailyItemsNeeded.toFixed(1)}/day)`}

## Lead Source Performance (Ranked by Items)
| Source | Items | Premium | Sales |
|--------|-------|---------|-------|
${leadSourceData.length > 0 ? leadSourceData.map((s, i) => `| ${i === 0 ? '🔥 ' : ''}${s.name}${s.is_csr ? ' [CSR]' : ''} | ${s.items} | $${s.premium.toLocaleString()} | ${s.sales} |`).join('\n') : '| No lead source data | - | - | - |'}

${csrSources.length > 0 ? `## CSR Performance
CSR Referrals Total: **${csrTotals.items} items**, $${csrTotals.premium.toLocaleString()} premium

${csrSources.map(s => `- ${s.name}: ${s.items} items, $${s.premium.toLocaleString()} premium`).join('\n')}` : ''}

## CSR Monthly Incentive Tiers (Reference)
| Tier | Bonus | Requirements |
|------|-------|--------------|
| 🥇 Top | $2,000 | 5 ALR, 5 Referrals, 25 Cross-Sell Quotes, 5 Reviews |
| 🥈 Mid | $1,250 | 3 ALR, 3 Referrals, 15 Cross-Sell Quotes, 3 Reviews |
| 🥉 Bottom | $750 | 2 ALR, 2 Referrals, 10 Cross-Sell Quotes, 2 Reviews |

${previousEmailContent ? `## Previous Week's Coaching Notes (For Rotation Reference)
${previousEmailContent}

⚠️ IMPORTANT: Do NOT repeat the same pressure points. Rotate to different areas this week.` : ''}

${announcements ? `## Announcements/Context to Include
${announcements}` : ''}

## Notes for Generation
- Life insurance reminder: Send opportunities to Aleeah (need 3 life apps issued by 2/28/2026 for Q1 promo)
- Always ask for Google reviews on every win
- Always ask for referrals on every sale
- Lead Manager should be worked daily`

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

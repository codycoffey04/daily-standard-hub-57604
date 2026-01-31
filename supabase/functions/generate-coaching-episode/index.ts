import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type CoachingType = 'sales' | 'service'

interface RequestBody {
  producerId?: string
  csrProfileId?: string
  weekStart: string
  coachingType?: CoachingType
}

interface TranscriptData {
  id: string
  file_name: string
  file_path: string
  extracted_text: string | null
  extraction_status: string | null
  call_date: string | null
  call_duration_seconds: number | null
  call_direction: string | null
}

interface ProducerMetrics {
  qhh: number
  quotes: number
  sales: number
  items: number
  premium: number
  close_rate: number
}

interface FocusWeek {
  week: number
  theme: string
  primary_step: string
  focus_question: string
  challenge: string
}

interface SalesScoreResult {
  transcript_id: string
  step_1_opening: number
  step_2_discovery: number
  step_3_quoting: number
  step_4_ask_for_sale: number
  step_5_closing: number
  step_6_follow_up: number
  step_7_multi_line: number
  step_8_referral_ask: number
  overall_score: number
  call_outcome: string
  cross_sell_triggers_detected: Array<{ trigger: string; context: string; pursued: boolean }>
  strengths: Array<{ category: string; quote: string }>
  improvement_areas: Array<{ category: string; quote: string; suggestion: string }>
}

interface CSRScoreResult {
  transcript_id: string
  call_type: string
  step_1_greeting: number
  step_2_listening_empathy: number
  step_3_problem_id: number
  step_4_resolution: number
  step_5_cross_sell: number
  step_6_referral_ask_csr: number | string // Can be "N/A"
  step_7_retention: number | string // Can be "N/A"
  google_review_ask: boolean
  overall_score: number
  max_possible_score: number
  call_outcome: string
  cross_sell_triggers_detected: Array<{ trigger: string; context: string; pursued: boolean }>
  life_insurance_opportunity: boolean
  life_insurance_context: string | null
  strengths: Array<{ category: string; quote: string }>
  improvement_areas: Array<{ category: string; quote: string; suggestion: string }>
}

interface ClaudeResponse {
  scores: (SalesScoreResult | CSRScoreResult)[]
  episode_markdown: string
  summary: string
}

interface TeamMember {
  id: string
  display_name: string
  role?: string
}

interface CSRProfile {
  name: string
  display_name: string
  role: string
  location: string
  strengths: string[]
  growth_areas: string[]
  coaching_notes: string
  special_tracking: {
    life_insurance_tracking?: boolean
    life_triggers?: string[]
  } | null
}

serve(async (req) => {
  console.log('=== COACHING EPISODE GENERATION STARTED ===')

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const startTime = Date.now()
    console.log(`[${Date.now() - startTime}ms] Parsing request body...`)

    // Get request body
    const body: RequestBody = await req.json()
    console.log(`[${Date.now() - startTime}ms] Request: coachingType=${body.coachingType}, weekStart=${body.weekStart}`)
    const { producerId, csrProfileId, weekStart, coachingType = 'sales' } = body

    // Validate: must have either producerId or csrProfileId based on coachingType
    if (coachingType === 'sales' && !producerId) {
      throw new Error('Missing required field: producerId for sales coaching')
    }
    if (coachingType === 'service' && !csrProfileId) {
      throw new Error('Missing required field: csrProfileId for service coaching')
    }
    if (!weekStart) {
      throw new Error('Missing required field: weekStart')
    }

    const memberId = coachingType === 'sales' ? producerId! : csrProfileId!

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Calculate week end
    const weekStartDate = new Date(weekStart)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekStartDate.getDate() + 6)
    const weekEnd = weekEndDate.toISOString().split('T')[0]

    // Fetch team member info based on coaching type
    let teamMember: TeamMember
    let csrProfileData: CSRProfile | null = null

    if (coachingType === 'sales') {
      const { data: producer, error: producerError } = await supabase
        .from('producers')
        .select('*')
        .eq('id', memberId)
        .single()

      if (producerError || !producer) {
        throw new Error(`Producer not found: ${memberId}`)
      }
      teamMember = { id: producer.id, display_name: producer.display_name }
    } else {
      // Service mode - fetch from csr_profiles
      const { data: csrProfile, error: csrError } = await supabase
        .from('csr_profiles')
        .select('*')
        .eq('id', memberId)
        .single()

      if (csrError || !csrProfile) {
        throw new Error(`CSR Profile not found: ${memberId}`)
      }
      teamMember = {
        id: csrProfile.id,
        display_name: csrProfile.display_name,
        role: csrProfile.role
      }

      // Also fetch CSR profile config for coaching context
      const { data: configs } = await supabase
        .from('coaching_framework_config')
        .select('config_data')
        .eq('config_type', 'csr_profiles')
        .eq('active', true)
        .single()

      if (configs?.config_data) {
        const csrProfiles = (configs.config_data as { csrs: CSRProfile[] }).csrs
        csrProfileData = csrProfiles.find(
          p => p.display_name.toLowerCase() === csrProfile.display_name.toLowerCase()
        ) || null
      }
    }

    // Fetch transcripts for this member/week
    const transcriptQuery = supabase
      .from('coaching_transcripts')
      .select('*')
      .eq('week_start', weekStart)
      .eq('coaching_type', coachingType)

    if (coachingType === 'sales') {
      transcriptQuery.eq('producer_id', memberId)
    } else {
      transcriptQuery.eq('csr_profile_id', memberId)
    }

    const { data: transcripts, error: transcriptsError } = await transcriptQuery

    if (transcriptsError) {
      throw new Error(`Failed to fetch transcripts: ${transcriptsError.message}`)
    }

    if (!transcripts || transcripts.length === 0) {
      throw new Error(`No transcripts found for this ${coachingType === 'sales' ? 'producer' : 'CSR'}/week`)
    }

    // Process transcripts - download PDFs and convert to base64
    // Claude reads PDFs natively (Total Recall PDFs are image-based)
    console.log(`Processing ${transcripts.length} transcripts for ${teamMember.display_name} (${coachingType} mode)`)

    const pdfDocuments: Array<{ transcript: TranscriptData; base64: string }> = []

    for (const transcript of transcripts as TranscriptData[]) {
      console.log(`Downloading file: ${transcript.file_path}`)

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('coaching-transcripts')
        .download(transcript.file_path)

      if (downloadError) {
        console.error(`Failed to download ${transcript.file_name}:`, downloadError)
        continue
      }

      // Convert PDF to base64 for Claude's native PDF support
      const arrayBuffer = await fileData.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      let binaryString = ''
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i])
      }
      const base64 = btoa(binaryString)

      console.log(`Downloaded PDF ${transcript.file_name}: ${arrayBuffer.byteLength} bytes`)
      pdfDocuments.push({ transcript, base64 })
    }

    if (pdfDocuments.length === 0) {
      throw new Error('No transcripts could be processed.')
    }

    console.log(`Successfully processed ${pdfDocuments.length}/${transcripts.length} PDF transcripts`)

    // Metrics handling - only for sales mode
    let producerMetrics: ProducerMetrics | null = null

    if (coachingType === 'sales') {
      // Fetch AgencyZoom metrics for this week (Sales, Items, Premium)
      const { data: metricsData, error: metricsError } = await supabase
        .from('coaching_metrics')
        .select('*')
        .eq('week_start', weekStart)
        .eq('coaching_type', 'sales')
        .single()

      if (metricsError || !metricsData) {
        throw new Error('Metrics not found for this week')
      }

      const producerKey = teamMember.display_name.toLowerCase()
      const azMetrics = (metricsData.producer_metrics as Record<string, ProducerMetrics>)[producerKey]

      if (!azMetrics) {
        throw new Error(`Metrics not found for producer: ${teamMember.display_name}`)
      }

      // Fetch TDS activity data (QHH, Quotes from daily_entries + quoted_households)
      console.log(`Fetching TDS activity data for ${weekStart} to ${weekEnd}`)

      const { data: entries, error: entriesErr } = await supabase
        .from('daily_entries')
        .select('id')
        .eq('producer_id', memberId)
        .gte('entry_date', weekStart)
        .lte('entry_date', weekEnd)

      let tdsQhh = 0
      let tdsQuotes = 0

      if (!entriesErr && entries && entries.length > 0) {
        const entryIds = entries.map(e => e.id)

        const { data: qhRows, error: qhErr } = await supabase
          .from('quoted_households')
          .select('lead_id, lines_quoted')
          .in('daily_entry_id', entryIds)

        if (!qhErr && qhRows) {
          const uniqueLeads = new Set<string>()
          for (const row of qhRows) {
            if (row.lead_id) {
              uniqueLeads.add(row.lead_id)
            }
            tdsQuotes += row.lines_quoted || 0
          }
          tdsQhh = uniqueLeads.size
        }
      }

      console.log(`TDS activity: QHH=${tdsQhh}, Quotes=${tdsQuotes}`)

      producerMetrics = {
        qhh: tdsQhh > 0 ? tdsQhh : azMetrics.qhh,
        quotes: tdsQuotes > 0 ? tdsQuotes : azMetrics.quotes,
        sales: azMetrics.sales,
        items: azMetrics.items,
        premium: azMetrics.premium,
        close_rate: tdsQhh > 0 ? (azMetrics.sales / tdsQhh) * 100 : azMetrics.close_rate
      }
    }

    // Fetch coaching framework configs based on coaching type
    const { data: configs, error: configsError } = await supabase
      .from('coaching_framework_config')
      .select('*')
      .eq('active', true)

    if (configsError) {
      throw new Error(`Failed to fetch configs: ${configsError.message}`)
    }

    // Get config type prefix based on coaching type
    const configPrefix = coachingType === 'service' ? 'csr_' : ''

    const scorecardConfig = configs.find(c => c.config_type === `${configPrefix}scorecard`)?.config_data
    const crossSellConfig = configs.find(c => c.config_type === `${configPrefix}cross_sell_triggers`)?.config_data
    const focusRotationConfig = configs.find(c => c.config_type === `${configPrefix}focus_rotation`)?.config_data
    const profilesConfig = configs.find(c => c.config_type === `${configPrefix}${coachingType === 'sales' ? 'producer_profiles' : 'profiles'}`)?.config_data

    // Calculate focus week number based on coaching type
    const cycleStart = new Date('2026-01-06')
    const msPerWeek = 7 * 24 * 60 * 60 * 1000
    const weeksSinceStart = Math.floor((weekStartDate.getTime() - cycleStart.getTime()) / msPerWeek)

    // Sales = 8-week cycle, Service = 6-week cycle
    const cycleLength = coachingType === 'service' ? 6 : 8
    const focusWeekNumber = ((weeksSinceStart % cycleLength) + cycleLength) % cycleLength + 1

    const focusWeek = (focusRotationConfig as { weeks: FocusWeek[] })?.weeks?.find(
      w => w.week === focusWeekNumber
    )

    // Get member profile
    let memberProfile: { strengths?: string[]; growth_areas?: string[]; monthly_target_items?: number; coaching_notes?: string } | null = null

    if (coachingType === 'sales') {
      const producerProfiles = (profilesConfig as { producers: Array<{ display_name: string; strengths: string[]; growth_areas: string[]; monthly_target_items: number }> })?.producers
      memberProfile = producerProfiles?.find(
        p => p.display_name.toLowerCase() === teamMember.display_name.toLowerCase()
      ) || null
    } else if (csrProfileData) {
      memberProfile = {
        strengths: csrProfileData.strengths,
        growth_areas: csrProfileData.growth_areas,
        coaching_notes: csrProfileData.coaching_notes
      }
    }

    // Build document content blocks for Claude's native PDF support
    const documentBlocks = pdfDocuments.map(doc => ({
      type: 'document' as const,
      source: {
        type: 'base64' as const,
        media_type: 'application/pdf' as const,
        data: doc.base64
      }
    }))

    // Build text context for transcript metadata
    const transcriptContext = pdfDocuments.map((doc, i) =>
      `Transcript ${i + 1}: ${doc.transcript.file_name} (Date: ${doc.transcript.call_date || 'Unknown'}, Duration: ${doc.transcript.call_duration_seconds ? Math.floor(doc.transcript.call_duration_seconds / 60) + ' min' : 'Unknown'})`
    ).join('\n')

    // Build Claude prompt based on coaching type
    let systemPrompt: string
    let userPrompt: string

    if (coachingType === 'sales') {
      // === SALES MODE PROMPTS ===
      systemPrompt = `You are an expert sales coach for Coffey Agencies, an Allstate-exclusive insurance agency.
You analyze call transcripts and generate personalized coaching episodes.

Your coaching style:
- Supportive but direct
- Evidence-based (use specific quotes from transcripts)
- 2:1 positive to corrective ratio
- Focus on one growth area per episode
- Tie everything to business outcomes (items, premium, commission)

Agency context:
- Monthly target: ${memberProfile?.monthly_target_items || 76} items
- Referrals close at 25% vs Net Leads at 8%
- Bundling increases retention and premium

Producer profile for ${teamMember.display_name}:
- Known strengths: ${memberProfile?.strengths?.join(', ') || 'Not specified'}
- Growth areas: ${memberProfile?.growth_areas?.join(', ') || 'Not specified'}`

      userPrompt = `## Task
Analyze the attached PDF call transcripts and generate a coaching episode for ${teamMember.display_name}.

The PDF documents attached above are call recordings from Total Recall. Each PDF contains a transcript with timestamps, speaker labels (Agent/Customer), and the full conversation.

## Transcript Files
${transcriptContext}

## This Week's Focus Theme
${focusWeek?.theme || 'General Improvement'} (Week ${focusWeekNumber})
Focus question: "${focusWeek?.focus_question || 'How can we improve?'}"
Challenge: "${focusWeek?.challenge || 'Apply one new technique this week'}"

## Weekly Metrics
- QHH: ${producerMetrics!.qhh} (from TDS activity)
- Quotes: ${producerMetrics!.quotes} (lines quoted from TDS)
- Sales: ${producerMetrics!.sales} (from AgencyZoom)
- Items: ${producerMetrics!.items} (from AgencyZoom)
- Premium: $${producerMetrics!.premium.toFixed(2)} (from AgencyZoom)
- Close Rate: ${producerMetrics!.close_rate.toFixed(1)}%

## Scorecard Criteria (0-2 scale: 0=Missed, 1=Partial, 2=Strong)
${JSON.stringify(scorecardConfig, null, 2)}

## Cross-Sell Triggers to Detect
${JSON.stringify(crossSellConfig, null, 2)}

## Required Output Format
Return a JSON object with exactly this structure:
{
  "scores": [
    {
      "transcript_id": "<id from transcript>",
      "step_1_opening": <0-2>,
      "step_2_discovery": <0-2>,
      "step_3_quoting": <0-2>,
      "step_4_ask_for_sale": <0-2>,
      "step_5_closing": <0-2>,
      "step_6_follow_up": <0-2>,
      "step_7_multi_line": <0-2>,
      "step_8_referral_ask": <0-2>,
      "overall_score": <sum of above>,
      "call_outcome": "<sale|quote|service|unknown>",
      "cross_sell_triggers_detected": [{"trigger": "...", "context": "...", "pursued": true/false}],
      "strengths": [{"category": "...", "quote": "..."}],
      "improvement_areas": [{"category": "...", "quote": "...", "suggestion": "..."}]
    }
  ],
  "episode_markdown": "<full coaching episode in markdown format, 1200-1400 words>",
  "summary": "<2-3 sentence summary of key findings>"
}

The episode_markdown should follow this structure:
1. Welcome (2 sentences)
2. Your Numbers (metrics summary with context)
3. What You Did Well (2+ specific wins with quotes, 40% of content)
4. Growth Opportunity (ONE specific area, 30% of content)
5. This Week's Focus (from rotation)
6. Challenge (specific measurable goal)
7. Closing (3 sentences)

CRITICAL JSON FORMATTING RULES:
1. Return ONLY raw JSON - NO markdown code blocks, NO \`\`\`json, NO \`\`\`
2. All string values must have quotes and backslashes escaped (use \\" and \\\\)
3. In "quote" fields, include the ENTIRE quote as one string value - do NOT add annotations outside the quotes
4. WRONG: "quote": "Great job." (at 5:30)
5. RIGHT: "quote": "Great job. (at 5:30 during closing)"
6. Use \\n for line breaks within strings
7. Test: your output must be valid JSON that JSON.parse() can handle`

    } else {
      // === SERVICE MODE PROMPTS ===
      const isAleeah = teamMember.display_name.toLowerCase().includes('aleeah')

      systemPrompt = `You are a CSR coaching analyst for Coffey Agencies, an Allstate-exclusive insurance agency with locations in Centre, Alabama and Rome, Georgia. You analyze inbound service and claims call transcripts to help coach customer service representatives.

IMPORTANT CONTEXT:
- These are SERVICE calls, not sales calls. Do not evaluate CSRs on selling skills, closing techniques, or quote presentation.
- CSRs are evaluated on: greeting/tone, empathy, problem identification, resolution, cross-sell IDENTIFICATION (not closing), referral asks, and retention language.
- Cross-sell scoring means identifying opportunities and offering to connect the customer with a producer — not making the sale themselves.
- Retention is only scored when a customer mentions cancelling, switching, or leaving.

CSR Profile for ${teamMember.display_name}:
- Role: ${teamMember.role || 'CSR'}
- Known strengths: ${memberProfile?.strengths?.join(', ') || 'Not specified'}
- Growth areas: ${memberProfile?.growth_areas?.join(', ') || 'Not specified'}
${memberProfile?.coaching_notes ? `- Coaching notes: ${memberProfile.coaching_notes}` : ''}
${isAleeah ? `
SPECIAL: Aleeah has a dual role — CSR + Life Sales.
On EVERY call, evaluate whether a life insurance opportunity existed.

LIFE INSURANCE TRIGGERS (listen for these):
- Family changes: baby, pregnant, expecting, marriage, engaged, divorce, custody
- Financial milestones: mortgage, new home, bought a house, refinance, new car payment
- Life stages: retirement, turning 65, kids going to college, empty nest
- Health mentions: doctor, hospital, diagnosis, surgery, health scare (approach sensitively)
- Coverage gaps: "I don't have life insurance", beneficiary questions, "what happens if..."
- Policy changes: adding teen driver (young family = life need), removing spouse (divorce = coverage review)

SOFT APPROACH SCRIPTS (plant seeds, don't hard sell):
- "By the way, since you mentioned the new baby — congratulations! Have you had a chance to think about life insurance? I can set up a quick call to review options if you're interested."
- "I noticed you're adding your teenager to the policy — exciting times! A lot of families like to review their life coverage when kids start driving. Want me to send some info?"
- "With the new mortgage, it might be worth making sure your family is protected if anything happens. I'd be happy to run some numbers for you."

Always flag life_insurance_opportunity as true/false with context quote from the call.` : ''}

SCORING SCALE:
- 0 = Missed — Did not attempt or failed significantly
- 1 = Partial — Attempted but incomplete
- 2 = Strong — Executed well

CONDITIONAL SCORING:
- Step 7 (Retention): Only score if customer mentions cancelling, switching, or being unhappy. Otherwise mark as "N/A"
- Referral Ask: If the call ended negatively (unresolved, upset customer), mark referral ask as N/A — asking would be inappropriate
- Google Review Ask: Binary (true/false). Only appropriate after positive resolution with satisfied customer.

CALL TYPE CLASSIFICATION:
Classify each call as one of: service, claims, billing, endorsement
- service: General policy questions, ID cards, proof of insurance, coverage questions
- claims: Filing claims, claims status, claims questions
- billing: Payments, past-due, payment plans, reinstatements
- endorsement: Adding/removing vehicles, drivers, coverage changes`

      userPrompt = `## Task
Analyze the attached PDF call transcripts and generate a coaching episode for ${teamMember.display_name}.

The PDF documents attached above are call recordings from Total Recall. Each PDF contains a transcript with timestamps, speaker labels (Agent/Customer), and the full conversation.

## Transcript Files
${transcriptContext}

## This Week's Focus Theme
${focusWeek?.theme || 'General Improvement'} (Week ${focusWeekNumber} of 6-week rotation)
Focus question: "${focusWeek?.focus_question || 'How can we improve?'}"
Challenge: "${focusWeek?.challenge || 'Apply one new technique this week'}"

## Scorecard Criteria (0-2 scale: 0=Missed, 1=Partial, 2=Strong)
${JSON.stringify(scorecardConfig, null, 2)}

## Cross-Sell Triggers to Detect
${JSON.stringify(crossSellConfig, null, 2)}

## Required Output Format
Return a JSON object with exactly this structure:
{
  "scores": [
    {
      "transcript_id": "<id from transcript>",
      "call_type": "<service|claims|billing|endorsement>",
      "step_1_greeting": <0-2>,
      "step_2_listening_empathy": <0-2>,
      "step_3_problem_id": <0-2>,
      "step_4_resolution": <0-2>,
      "step_5_cross_sell": <0-2>,
      "step_6_referral_ask_csr": <0-2 or "N/A">,
      "step_7_retention": <0-2 or "N/A">,
      "google_review_ask": <true|false>,
      "overall_score": <sum of scored steps>,
      "max_possible_score": <max based on applicable steps>,
      "call_outcome": "<resolved|escalated|callback_needed|transferred>",
      "cross_sell_triggers_detected": [{"trigger": "...", "context": "...", "pursued": true/false}],
      "life_insurance_opportunity": <true|false>,
      "life_insurance_context": "<quote if applicable, null if no opportunity>",
      "strengths": [{"category": "...", "quote": "..."}],
      "improvement_areas": [{"category": "...", "quote": "...", "suggestion": "..."}]
    }
  ],
  "episode_markdown": "<full coaching episode in markdown format, 1000-1200 words>",
  "summary": "<2-3 sentence summary of key findings>"
}

The episode_markdown should follow this CSR-specific structure:
1. Welcome (2 sentences, warm greeting for ${teamMember.display_name})
2. Your Week (call volume, types, notable patterns - 4 sentences)
3. What You Did Well (2+ specific wins with transcript quotes, 40% of content)
4. Growth Opportunity (ONE specific area, 30% of content, with exact language to say instead)
5. This Week's Focus (from 6-week rotation, with one clear behavior and exact language to use)
${isAleeah ? `6. Life Insurance Opportunities (REQUIRED for Aleeah):
   - How many calls had life triggers? List each trigger found.
   - Did Aleeah pursue the opportunity? If yes, what did she say? If no, what could she have said?
   - Specific coaching: "When a customer mentions [trigger], try saying: '[exact script]'"
   - Goal: Plant seeds for life conversations, not hard sell
7. Challenge (specific measurable goal - include one life-related goal)
8. Closing (3 sentences with encouragement)` : `6. Challenge (specific measurable goal tied to customer experience)
7. Closing (3 sentences with encouragement)`}

TONE GUIDELINES:
- Sound like a supportive team lead talking to a valued team member
- Use "you" and "your" throughout
- Be specific with names, quotes, and situations from actual calls
- Acknowledge that service work is emotionally demanding
- Frame value: "When you handle that call well, that customer stays"
- DO NOT compare this CSR to others
- DO NOT use sales jargon (close rate, pipeline, conversion)
- Focus on ONE growth area — don't pile on criticism

CRITICAL JSON FORMATTING RULES:
1. Return ONLY raw JSON - NO markdown code blocks, NO \`\`\`json, NO \`\`\`
2. All string values must have quotes and backslashes escaped (use \\" and \\\\)
3. In "quote" fields, include the ENTIRE quote as one string value - do NOT add annotations outside the quotes
4. WRONG: "quote": "I hear you." (at 8:16)
5. RIGHT: "quote": "I hear you. (at 8:16 when customer expressed confusion)"
6. Use \\n for line breaks within strings
7. Test: your output must be valid JSON that JSON.parse() can handle`
    }

    // Call Claude API with PDF documents
    console.log(`Sending ${documentBlocks.length} PDF documents to Claude API (${coachingType} mode)`)

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: [
              ...documentBlocks,
              { type: 'text', text: userPrompt }
            ]
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
    let parsedResponse: ClaudeResponse
    try {
      // Log raw response for debugging (truncated to avoid log overflow)
      console.log(`=== RAW CLAUDE RESPONSE (first 2000 chars) ===`)
      console.log(responseText.substring(0, 2000))
      console.log(`=== RAW RESPONSE LENGTH: ${responseText.length} chars ===`)

      // Strip markdown code blocks if present (```json ... ```)
      let cleanedResponse = responseText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      // Log the JSON we're about to parse
      console.log(`=== JSON MATCH LENGTH: ${jsonMatch[0].length} chars ===`)

      parsedResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      // Enhanced error logging for JSON parse failures
      console.error('=== JSON PARSE ERROR ===')
      console.error(`Error: ${parseError}`)
      console.error(`Response length: ${responseText.length}`)
      console.error(`Coaching type: ${coachingType}`)
      console.error(`Team member: ${teamMember.display_name}`)

      // Log around the error position if it's a position-based error
      const posMatch = String(parseError).match(/position (\d+)/)
      if (posMatch) {
        const pos = parseInt(posMatch[1])
        const start = Math.max(0, pos - 100)
        const end = Math.min(responseText.length, pos + 100)
        console.error(`=== CONTEXT AROUND POSITION ${pos} ===`)
        console.error(responseText.substring(start, end))
        console.error(`=== END CONTEXT ===`)
      }

      // Log first and last 500 chars
      console.error('=== FIRST 500 CHARS ===')
      console.error(responseText.substring(0, 500))
      console.error('=== LAST 500 CHARS ===')
      console.error(responseText.substring(responseText.length - 500))

      throw new Error(`Failed to parse Claude response: ${parseError}`)
    }

    // Calculate generation duration
    const generationDuration = Date.now() - startTime
    const tokensUsed = claudeData.usage?.input_tokens + claudeData.usage?.output_tokens || 0

    // Create or update the episode
    const episodeQuery = supabase
      .from('coaching_episodes')
      .select('id')
      .eq('week_start', weekStart)
      .eq('coaching_type', coachingType)

    if (coachingType === 'sales') {
      episodeQuery.eq('producer_id', memberId)
    } else {
      episodeQuery.eq('csr_profile_id', memberId)
    }

    const { data: existingEpisode } = await episodeQuery.single()

    // Build episode data based on coaching type
    const baseEpisodeData = {
      week_start: weekStart,
      week_end: weekEnd,
      coaching_type: coachingType,
      episode_title: `${teamMember.display_name}'s Coaching - Week of ${weekStart}`,
      episode_content: parsedResponse.episode_markdown,
      episode_summary: parsedResponse.summary,
      focus_theme: focusWeek?.theme || 'General',
      focus_week_number: focusWeekNumber,
      focus_challenge: focusWeek?.challenge || null,
      model_used: 'claude-opus-4-5-20251101',
      tokens_used: tokensUsed,
      generation_duration_ms: generationDuration,
      status: 'published',
      updated_at: new Date().toISOString()
    }

    let episodeData: Record<string, unknown>

    if (coachingType === 'sales') {
      // Fetch metrics_id for sales mode
      const { data: metricsData } = await supabase
        .from('coaching_metrics')
        .select('id')
        .eq('week_start', weekStart)
        .eq('coaching_type', 'sales')
        .single()

      episodeData = {
        ...baseEpisodeData,
        producer_id: memberId,
        csr_profile_id: null,
        metrics_id: metricsData?.id || null,
        qhh: producerMetrics!.qhh,
        quotes: producerMetrics!.quotes,
        sales: producerMetrics!.sales,
        items: producerMetrics!.items,
        premium: producerMetrics!.premium,
        close_rate: producerMetrics!.close_rate
      }
    } else {
      // Service mode - no metrics
      episodeData = {
        ...baseEpisodeData,
        producer_id: null,
        csr_profile_id: memberId,
        metrics_id: null,
        qhh: null,
        quotes: null,
        sales: null,
        items: null,
        premium: null,
        close_rate: null
      }
    }

    let episodeId: string

    if (existingEpisode) {
      const { error: updateError } = await supabase
        .from('coaching_episodes')
        .update(episodeData)
        .eq('id', existingEpisode.id)

      if (updateError) throw new Error(`Failed to update episode: ${updateError.message}`)
      episodeId = existingEpisode.id
    } else {
      const { data: newEpisode, error: insertError } = await supabase
        .from('coaching_episodes')
        .insert(episodeData)
        .select('id')
        .single()

      if (insertError) throw new Error(`Failed to create episode: ${insertError.message}`)
      episodeId = newEpisode.id
    }

    // Save scores for each transcript
    for (let i = 0; i < parsedResponse.scores.length; i++) {
      const score = parsedResponse.scores[i]
      const doc = pdfDocuments[i]
      const transcript = doc?.transcript

      if (transcript) {
        let scoreData: Record<string, unknown>

        if (coachingType === 'sales') {
          const salesScore = score as SalesScoreResult
          scoreData = {
            transcript_id: transcript.id,
            episode_id: episodeId,
            coaching_type: 'sales',
            // Sales-specific columns
            step_1_opening: salesScore.step_1_opening,
            step_2_discovery: salesScore.step_2_discovery,
            step_3_quoting: salesScore.step_3_quoting,
            step_4_ask_for_sale: salesScore.step_4_ask_for_sale,
            step_5_closing: salesScore.step_5_closing,
            step_6_follow_up: salesScore.step_6_follow_up,
            step_7_multi_line: salesScore.step_7_multi_line,
            step_8_referral_ask: salesScore.step_8_referral_ask,
            overall_score: salesScore.overall_score,
            call_outcome: salesScore.call_outcome,
            cross_sell_triggers_detected: salesScore.cross_sell_triggers_detected,
            strengths: salesScore.strengths,
            improvement_areas: salesScore.improvement_areas,
            // CSR columns set to null
            step_1_greeting: null,
            step_2_listening_empathy: null,
            step_3_problem_id: null,
            step_4_resolution: null,
            step_5_cross_sell: null,
            step_6_referral_ask_csr: null,
            step_7_retention: null,
            google_review_ask: null,
            life_insurance_opportunity: null,
            life_insurance_context: null,
            call_type: null
          }
        } else {
          const csrScore = score as CSRScoreResult

          // Helper to convert "N/A" strings or non-numeric values to null for integer columns
          const toIntOrNull = (val: number | string | null | undefined): number | null => {
            if (val === null || val === undefined) return null
            if (typeof val === 'string') {
              if (val.toUpperCase() === 'N/A' || val.trim() === '') return null
              const parsed = parseInt(val, 10)
              return isNaN(parsed) ? null : parsed
            }
            return typeof val === 'number' ? val : null
          }

          scoreData = {
            transcript_id: transcript.id,
            episode_id: episodeId,
            coaching_type: 'service',
            // CSR-specific columns
            step_1_greeting: toIntOrNull(csrScore.step_1_greeting),
            step_2_listening_empathy: toIntOrNull(csrScore.step_2_listening_empathy),
            step_3_problem_id: toIntOrNull(csrScore.step_3_problem_id),
            step_4_resolution: toIntOrNull(csrScore.step_4_resolution),
            step_5_cross_sell: toIntOrNull(csrScore.step_5_cross_sell),
            step_6_referral_ask_csr: toIntOrNull(csrScore.step_6_referral_ask_csr),
            step_7_retention: toIntOrNull(csrScore.step_7_retention),
            google_review_ask: csrScore.google_review_ask,
            life_insurance_opportunity: csrScore.life_insurance_opportunity,
            life_insurance_context: csrScore.life_insurance_context,
            call_type: csrScore.call_type,
            overall_score: csrScore.overall_score,
            call_outcome: csrScore.call_outcome,
            cross_sell_triggers_detected: csrScore.cross_sell_triggers_detected,
            strengths: csrScore.strengths,
            improvement_areas: csrScore.improvement_areas,
            // Sales columns set to null
            step_1_opening: null,
            step_2_discovery: null,
            step_3_quoting: null,
            step_4_ask_for_sale: null,
            step_5_closing: null,
            step_6_follow_up: null,
            step_7_multi_line: null,
            step_8_referral_ask: null
          }
        }

        // Upsert score using transcript_id + coaching_type
        const { error: scoreError } = await supabase
          .from('coaching_scores')
          .upsert(scoreData, { onConflict: 'transcript_id' })

        if (scoreError) {
          console.error('Failed to save score:', scoreError)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        episodeId,
        summary: parsedResponse.summary,
        tokensUsed,
        generationDurationMs: generationDuration,
        transcriptsProcessed: pdfDocuments.length,
        coachingType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating episode:', error)

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

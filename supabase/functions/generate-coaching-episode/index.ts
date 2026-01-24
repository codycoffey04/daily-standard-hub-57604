import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  producerId: string
  weekStart: string
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

interface ScoreResult {
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

interface ClaudeResponse {
  scores: ScoreResult[]
  episode_markdown: string
  summary: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const startTime = Date.now()

    // Get request body
    const { producerId, weekStart }: RequestBody = await req.json()

    if (!producerId || !weekStart) {
      throw new Error('Missing required fields: producerId and weekStart')
    }

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

    // Fetch producer info
    const { data: producer, error: producerError } = await supabase
      .from('producers')
      .select('*')
      .eq('id', producerId)
      .single()

    if (producerError || !producer) {
      throw new Error(`Producer not found: ${producerId}`)
    }

    // Fetch transcripts for this producer/week
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('coaching_transcripts')
      .select('*')
      .eq('producer_id', producerId)
      .eq('week_start', weekStart)

    if (transcriptsError) {
      throw new Error(`Failed to fetch transcripts: ${transcriptsError.message}`)
    }

    if (!transcripts || transcripts.length === 0) {
      throw new Error('No transcripts found for this producer/week')
    }

    // Check if transcripts have extracted text (extracted client-side during upload)
    console.log(`Processing ${transcripts.length} transcripts for ${producer.display_name}`)
    const transcriptsWithText = transcripts.filter((t: TranscriptData) => t.extracted_text)

    if (transcriptsWithText.length === 0) {
      throw new Error('No transcripts have extracted text. Please re-upload the PDF files.')
    }

    console.log(`Found ${transcriptsWithText.length}/${transcripts.length} transcripts with extracted text`)

    // Fetch metrics for this week
    const { data: metricsData, error: metricsError } = await supabase
      .from('coaching_metrics')
      .select('*')
      .eq('week_start', weekStart)
      .single()

    if (metricsError || !metricsData) {
      throw new Error('Metrics not found for this week')
    }

    const producerKey = producer.display_name.toLowerCase()
    const producerMetrics = (metricsData.producer_metrics as Record<string, ProducerMetrics>)[producerKey]

    if (!producerMetrics) {
      throw new Error(`Metrics not found for producer: ${producer.display_name}`)
    }

    // Fetch coaching framework configs
    const { data: configs, error: configsError } = await supabase
      .from('coaching_framework_config')
      .select('*')
      .eq('active', true)

    if (configsError) {
      throw new Error(`Failed to fetch configs: ${configsError.message}`)
    }

    const scorecardConfig = configs.find(c => c.config_type === 'scorecard')?.config_data
    const crossSellConfig = configs.find(c => c.config_type === 'cross_sell_triggers')?.config_data
    const focusRotationConfig = configs.find(c => c.config_type === 'focus_rotation')?.config_data
    const producerProfilesConfig = configs.find(c => c.config_type === 'producer_profiles')?.config_data

    // Calculate focus week number
    const cycleStart = new Date('2026-01-06')
    const msPerWeek = 7 * 24 * 60 * 60 * 1000
    const weeksSinceStart = Math.floor((weekStartDate.getTime() - cycleStart.getTime()) / msPerWeek)
    const focusWeekNumber = ((weeksSinceStart % 8) + 8) % 8 + 1

    const focusWeek = (focusRotationConfig as { weeks: FocusWeek[] })?.weeks?.find(
      w => w.week === focusWeekNumber
    )

    // Get producer profile
    const producerProfile = (producerProfilesConfig as { producers: Array<{ display_name: string; strengths: string[]; growth_areas: string[]; monthly_target_items: number }> })?.producers?.find(
      p => p.display_name.toLowerCase() === producerKey
    )

    // Build transcript texts for Claude
    const transcriptTexts = transcriptsWithText.map((t: TranscriptData, i: number) => {
      if (t.extracted_text) {
        return `### Transcript ${i + 1}: ${t.file_name}
Date: ${t.call_date || 'Unknown'}
Duration: ${t.call_duration_seconds ? Math.floor(t.call_duration_seconds / 60) + ' min' : 'Unknown'}
Direction: ${t.call_direction || 'Unknown'}

${t.extracted_text}`
      } else {
        return `### Transcript ${i + 1}: ${t.file_name}
[Text extraction failed - unable to process this PDF]`
      }
    }).join('\n\n')

    // Build Claude prompt
    const systemPrompt = `You are an expert sales coach for Coffey Agencies, an Allstate-exclusive insurance agency.
You analyze call transcripts and generate personalized coaching episodes.

Your coaching style:
- Supportive but direct
- Evidence-based (use specific quotes from transcripts)
- 2:1 positive to corrective ratio
- Focus on one growth area per episode
- Tie everything to business outcomes (items, premium, commission)

Agency context:
- Monthly target: ${producerProfile?.monthly_target_items || 76} items
- Referrals close at 25% vs Net Leads at 8%
- Bundling increases retention and premium

Producer profile for ${producer.display_name}:
- Known strengths: ${producerProfile?.strengths?.join(', ') || 'Not specified'}
- Growth areas: ${producerProfile?.growth_areas?.join(', ') || 'Not specified'}`

    const userPrompt = `## Task
Analyze the following call transcripts and generate a coaching episode for ${producer.display_name}.

## This Week's Focus Theme
${focusWeek?.theme || 'General Improvement'} (Week ${focusWeekNumber})
Focus question: "${focusWeek?.focus_question || 'How can we improve?'}"
Challenge: "${focusWeek?.challenge || 'Apply one new technique this week'}"

## Weekly Metrics (from AgencyZoom)
- QHH: ${producerMetrics.qhh}
- Quotes: ${producerMetrics.quotes}
- Sales: ${producerMetrics.sales}
- Items: ${producerMetrics.items}
- Premium: $${producerMetrics.premium.toFixed(2)}
- Close Rate: ${producerMetrics.close_rate}%

## Scorecard Criteria (0-2 scale: 0=Missed, 1=Partial, 2=Strong)
${JSON.stringify(scorecardConfig, null, 2)}

## Cross-Sell Triggers to Detect
${JSON.stringify(crossSellConfig, null, 2)}

## Transcripts
${transcriptTexts}

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

IMPORTANT: Return ONLY the JSON object, no additional text or markdown code blocks.`

    // Call Claude API
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
          { role: 'user', content: userPrompt }
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
      // Try to extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      parsedResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText)
      throw new Error(`Failed to parse Claude response: ${parseError}`)
    }

    // Calculate generation duration
    const generationDuration = Date.now() - startTime
    const tokensUsed = claudeData.usage?.input_tokens + claudeData.usage?.output_tokens || 0

    // Create or update the episode
    const { data: existingEpisode } = await supabase
      .from('coaching_episodes')
      .select('id')
      .eq('producer_id', producerId)
      .eq('week_start', weekStart)
      .single()

    const episodeData = {
      producer_id: producerId,
      metrics_id: metricsData.id,
      week_start: weekStart,
      week_end: weekEnd,
      episode_title: `${producer.display_name}'s Coaching - Week of ${weekStart}`,
      episode_content: parsedResponse.episode_markdown,
      episode_summary: parsedResponse.summary,
      focus_theme: focusWeek?.theme || 'General',
      focus_week_number: focusWeekNumber,
      qhh: producerMetrics.qhh,
      quotes: producerMetrics.quotes,
      sales: producerMetrics.sales,
      items: producerMetrics.items,
      premium: producerMetrics.premium,
      close_rate: producerMetrics.close_rate,
      model_used: 'claude-sonnet-4-20250514',
      tokens_used: tokensUsed,
      generation_duration_ms: generationDuration,
      status: 'published'
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
    for (const score of parsedResponse.scores) {
      // Find the transcript by matching index (scores should be in order)
      const transcriptIndex = parsedResponse.scores.indexOf(score)
      const transcript = transcriptsWithText[transcriptIndex]

      if (transcript) {
        const scoreData = {
          transcript_id: transcript.id,
          episode_id: episodeId,
          step_1_opening: score.step_1_opening,
          step_2_discovery: score.step_2_discovery,
          step_3_quoting: score.step_3_quoting,
          step_4_ask_for_sale: score.step_4_ask_for_sale,
          step_5_closing: score.step_5_closing,
          step_6_follow_up: score.step_6_follow_up,
          step_7_multi_line: score.step_7_multi_line,
          step_8_referral_ask: score.step_8_referral_ask,
          overall_score: score.overall_score,
          call_outcome: score.call_outcome,
          cross_sell_triggers_detected: score.cross_sell_triggers_detected,
          strengths: score.strengths,
          improvement_areas: score.improvement_areas
        }

        // Upsert score
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
        transcriptsProcessed: transcriptsWithText.length
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

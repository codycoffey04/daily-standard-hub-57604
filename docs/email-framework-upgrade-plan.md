# TDS Email Generation Framework Upgrade

## Current State Analysis

### How Emails Are Currently Generated

The email generation uses a **Supabase Edge Function** (`supabase/functions/generate-email-update/index.ts`) that:

1. Fetches `email_metrics` record with production data + TDS activity
2. Fetches `email_lead_source_metrics` for lead source breakdown
3. Fetches config from `coaching_framework_config` (VC targets, CSR tiers, template settings)
4. Calculates WoW comparison data from previous period
5. Calculates VC pacing (workdays elapsed, projected finish)
6. Builds a prompt with data tables and sends to Claude API (`claude-sonnet-4-20250514`)
7. Parses JSON response (subject_line, html_content, markdown_content)
8. Saves to `email_updates` table

### Where the Prompt Lives

The prompt is **hardcoded in the edge function** at lines 254-349:

**System Prompt (lines 254-269):**
```
You are an expert sales manager at Coffey Agencies, an Allstate-exclusive insurance agency.
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
- Keep emojis to: 🔺 (up), 🔻 (down), ⚠️ (warning), ✅ (success), 🔥 (fire)
- Sign off with "LFG. 🔥" and "Cody"
```

**User Prompt (lines 275-349):**
- Data tables for production, TDS activity, VC pacing, lead sources
- Brief 10-section list of required email sections
- JSON output format instructions

---

## Gap Analysis: Current vs New Framework

| Current Implementation | New Framework Requirement | Gap |
|------------------------|---------------------------|-----|
| Generic "expert sales manager" persona | "Direct, no-BS agency owner who cares about results" voice | Need stronger, more specific persona |
| 10 sections listed as brief bullets | Detailed instructions for each of 11 sections | Need comprehensive section-by-section guidance |
| No narrative arc guidance | Stakes-aware opening, progress story, callback to narrative in closing | Need context about where we stand and momentum |
| Basic lead source list (name, items, premium) | Lead source insights with conversion analysis, comparisons | Need conversion rates, top/concerning flags, insights |
| Generic coaching notes instruction | Data-specific coaching with pipeline math (QHH - Sales = opportunities) | Need pipeline calculations and specific guidance |
| No CSR tier requirements | Full CSR incentive tier tracking with specific thresholds | Need tier table and tracking guidance |
| No quote pace tracking | 200/month per producer target tracking | Need quote pace calculations |
| No life insurance section | Life app tracking for Q1 Allstate promo (3 apps by 2/28/2026) | Need life insurance status section |
| No "don't do" rules | Clear "Rules — Do Not Break" section | Need guardrails to prevent common mistakes |
| Output: JSON with html_content, markdown_content | Output: Clean markdown for Outlook conversion | May need to adjust output format |

---

## Proposed New System Prompt

```
You are generating a weekly team email for Coffey Agencies, an Allstate-exclusive insurance agency with locations in Centre, AL and Rome, GA. The 2026 focus is Georgia production.

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
- Target: 76 items (Georgia 2026 baseline)
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

### 8. Life Insurance Update (if applicable)
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
5. ALWAYS reference the 76-item GA VC target
6. ALWAYS include Lead Source insights when data is provided
7. Ignore Revenue column from AgencyZoom (known to be inaccurate)

## Output Format

Generate the email in clean markdown that can be converted to HTML for Outlook.
```

---

## Proposed Enhanced User Prompt Data

In addition to existing data tables, add:

### 1. Pipeline Opportunities Per Producer
```
## Pipeline Analysis
| Producer | QHH | Sales | Pipeline (Unsold) |
|----------|-----|-------|-------------------|
| Maria | 80 | 15 | 65 households |
| Kimberly | 52 | 15 | 37 households |
```

### 2. Quote Pace Tracking
```
## Quote Pace (Target: 200/month per producer)
| Producer | Quotes MTD | Days Elapsed | Projected | Status |
|----------|------------|--------------|-----------|--------|
| Maria | 119 | 16 | 167 | ⚠️ Behind |
| Kimberly | 80 | 16 | 112 | ⚠️ Behind |
```

### 3. CSR Tier Requirements (Always Include)
```
## CSR Monthly Incentive Tiers
| Tier | Bonus | Requirements |
|------|-------|--------------|
| 🥇 Top | $2,000 | 5 ALR, 5 Referrals, 25 Cross-Sell Quotes, 5 Reviews |
| 🥈 Mid | $1,250 | 3 ALR, 3 Referrals, 15 Cross-Sell Quotes, 3 Reviews |
| 🥉 Bottom | $750 | 2 ALR, 2 Referrals, 10 Cross-Sell Quotes, 2 Reviews |
```

### 4. Life Insurance Status
```
## Life Insurance Status
- Apps submitted this month: 1 (pending issue)
- Q1 Goal: 3 life apps issued by 2/28/2026
- Reminder: Send life opportunities to Aleeah
```

---

## Implementation Approach

### Option A: Hardcode in Edge Function (Simpler)
- Replace system prompt directly in `index.ts`
- Add new data calculations (pipeline, quote pace)
- Redeploy edge function

**Pros:** Single file change, easy to test
**Cons:** Requires redeploy to update prompt

### Option B: Store in Database Config (More Flexible)
- Add `email_system_prompt` config type to `coaching_framework_config`
- Edge function fetches prompt from database
- UI could allow editing the prompt

**Pros:** Update prompt without redeploy
**Cons:** More complex, needs migration

### Recommendation
Start with **Option A** to validate the framework works, then migrate to **Option B** if frequent prompt tuning is needed.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-email-update/index.ts` | Replace system prompt (lines 254-269), enhance user prompt (lines 275-349), add pipeline/pace calculations |

---

## Verification Plan

1. **Generate test email** with current week's data
2. **Verify all 11 sections** are present and match examples:
   - [ ] Opening hook (stakes-aware, references VC pace)
   - [ ] Production table with WoW deltas (🔺/🔻 format)
   - [ ] GA VC Pacing section (76-item target, gap, projection)
   - [ ] Quotes & Close Rate table (best performer flagged ✅)
   - [ ] Lead Source Performance with insights (🔥 top, ⚠️ concerning)
   - [ ] Coaching Notes (data-specific, pipeline math)
   - [ ] CSR Section with tier requirements
   - [ ] Life Insurance update
   - [ ] Announcements (if provided)
   - [ ] Week Focus bullet list (6-8 specific items)
   - [ ] Closing with "LFG. 🔥" and narrative callback
3. **Compare output** to the 3 example emails in framework doc
4. **Copy HTML to Outlook** and verify tables render correctly
5. **Test edge cases:**
   - No lead source data
   - No previous week for WoW comparison
   - Single producer vs multiple

---

## Example Emails for Reference

See the framework document for 3 complete example emails:
1. **Week of 1/5/2026** — First email of year, setting expectations
2. **Week of 1/12/2026** — Week 2, checking progress, first Google Ads week
3. **Week of 1/19/2026** — Week 3, push to close 76 items

These examples demonstrate:
- Stakes-aware opening hooks
- Proper WoW delta formatting
- Lead source insights with conversion analysis
- Pipeline math in coaching notes
- CSR section with tier references
- Narrative arc (started behind → closing gap → finish strong)

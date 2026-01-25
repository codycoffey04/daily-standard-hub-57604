# LEARNINGS.md - The Daily Standard (TDS)

> Institutional memory that compounds. Check before starting any task. Update after every session.
> Last updated: January 25, 2026 (audited)

---

## How to Use This File

1. **Before starting work**: Scan relevant sections for past mistakes and patterns
2. **During work**: Reference specific learnings when encountering similar situations
3. **After every session**: Add new discoveries, mistakes, and process improvements

---

## Data & Metrics

### QHH vs Quotes vs Items vs Sales
- **QHH** = Quoted Households = distinct customers quoted (COUNT DISTINCT lead_id)
- **Quotes** = Individual quote lines (SUM of lines_quoted) — one household can have multiple quotes
- **Items** = Policies sold (bundled sales produce multiple items from one sale)
- **Sales** = Households that purchased (customers acquired)
- **Close Rate** = Sales ÷ QHH (not Sales ÷ Quotes)

### Data Source Hierarchy
| What | Source of Truth | Why |
|------|-----------------|-----|
| Sales, Items, Premium | AgencyZoom | TDS may lag; AZ is production system |
| QHH, Quotes, Activity | TDS | Real-time entry by producers |
| Framework Status | TDS (calculated) | Based on daily metrics |

**Rule**: If AgencyZoom and TDS conflict, AgencyZoom wins for production metrics.

### Never Mix Timeframes
- ✅ Close Rate = Sales MTD ÷ QHH MTD
- ❌ Close Rate = Sales MTD ÷ QHH Weekly (WRONG — apples to oranges)
- Always verify both metrics share the same date range

### AgencyZoom Quirks
- **Revenue column is inaccurate** — always use Premium instead
- Source names vary: "Crystal" vs "Crystal Brozio" — use `email_source_mappings` to normalize
- Export formats differ between reports — validate column headers before processing

### Lead Source Close Rates
- **Cannot calculate** — TDS tracks QHH by producer, not by source
- Never claim to have source-level close rates
- We only have Items/Premium/Sales by source (from AgencyZoom)

### VC Pacing Calculation
- **% of Target** = Current Items ÷ Target (e.g., 68/76 = 89.5%)
- **Projected Finish** = (Current Items ÷ Days Elapsed) × Total Workdays
- Don't confuse pace projection with % of target — they're different metrics
- See commit `e0803fa` for the fix

### Workday Calculation (Mon-Fri Only)
```sql
-- Total workdays in month
SELECT COUNT(*) FROM generate_series(month_start, month_end, '1 day') d
WHERE EXTRACT(DOW FROM d) NOT IN (0, 6);

-- Elapsed workdays (up to today)
SELECT COUNT(*) FROM generate_series(month_start, CURRENT_DATE, '1 day') d
WHERE EXTRACT(DOW FROM d) NOT IN (0, 6);
```
- DOW 0 = Sunday, DOW 6 = Saturday
- ❌ Don't use `EXTRACT(DAY FROM date)` or hardcoded 20 workdays
- See commit `b8c193b` for the fix

### WoW Deltas
- **Need separate data uploads**: MTD production AND Weekly production
- WoW = This week's production vs last week's production
- ❌ NOT: MTD minus previous MTD (that's period-over-period)
- See commit `cb69a5d` for implementation

---

## Framework Logic

### Status Calculation Rules
- TOP: ≥2 metrics AND ≥1 impact metric (QHH or Items)
- BOTTOM: ≥2 metrics but ONLY effort metrics (Dials + Talk Time)
- OUTSIDE: <2 metrics met

### Common Confusion
- "I hit 2/4, why am I BOTTOM?" → Check if both were effort-only
- Framework compliance ≠ sales effectiveness — high-activity producers sometimes convert worse

### Territory Analysis
- Volume-weighted status is essential — low-volume zips stay "Healthy" regardless of conversion
- Geographic patterns > individual producer metrics for routing decisions
- 359xx area codes: strong performance
- Atlanta metro: historically weak conversion

---

## Lovable + Supabase Development

### Prompting Lovable
- **ONE change per prompt** — never bundle features
- Use Chat Mode first for analysis, then Agent Mode for implementation
- If Lovable enters a fix loop (3+ attempts same error), stop and reassess root cause
- Test each change before sending next prompt

### Schema Change Workflow
1. Run SQL migration in Supabase SQL Editor
2. Tell Lovable: "Schema updated, regenerate types"
3. Verify types regenerated in `src/integrations/supabase/types.ts`
4. THEN prompt for frontend changes
- Skipping type regeneration causes cascading TypeScript errors

### RLS & Security
- **Never** store roles in `profiles.role` — use separate `user_roles` table
- All aggregate functions on RLS-enabled tables need `SECURITY DEFINER` + `SET search_path = public`
- RLS policies should use `(SELECT auth.uid())` not bare `auth.uid()`
- Test with actual producer login, not just owner account

### Database Patterns That Work
- Create indexes on FK columns used in RLS policies
- Use `is_manager_or_owner()` helper functions for cleaner policies
- Batch large INSERTs — SQL Editor times out on large INSERT...SELECT

### Common Lovable Failures
- React Error #310: Passing objects where arrays expected
- Silent query failures: Missing `SECURITY DEFINER`
- Cache issues after permission changes: Hard refresh (Ctrl+Shift+R)
- "Project paused" stuck: Reconnect in Settings → Integrations

### React Query Infinite Loops
- **Symptom**: Component re-renders endlessly, API calls spike
- **Cause**: useEffect deps include objects that change identity each render
- **Fix**: Stabilize deps with useMemo, or use primitive values
- See commit `2eb1075` for email hooks fix

### Role Caching
- Roles are cached in memory for 1 minute (`CACHE_TTL_MS = 60_000`)
- **Must call `clearRolesCache()` on sign-out** — prevents stale data for next user
- Located in `src/lib/roles.ts`
- Uses `get_my_roles` and `has_my_role` RPC functions

---

## AI Features

### Coaching Episodes (claude-opus-4-20250514)
- Uses Opus model for flagship quality analysis
- 3 transcripts per producer per week
- Total Recall exports as image-PDFs — Claude reads natively, no OCR needed
- ~25,000 tokens per episode
- 8-step scorecard: 0-2 scale per step
- Focus rotation is 8-week cycle starting Jan 6, 2026
- **Data sources**: QHH/Quotes from TDS, Sales/Items/Premium from AgencyZoom

### Email Generation (claude-opus-4-20250514)
- Opus model required for quality — Sonnet produces weaker emails
- 11 sections in strict order
- Never hammer same producer two weeks in a row — rotate coaching pressure
- Never spotlight high close rate if quote volume is very low
- Lead Manager = CRM tool for tasks/to-dos/appointments/follow-ups, NOT a lead source

### PDF Handling Evolution
- **Failed attempt**: Client-side extraction with pdfjs-dist (commits `5c6220a`, `7eeb9c8`)
- **What went wrong**: Worker configuration issues in Vite, complex setup
- **Solution**: Claude native PDF support — just send base64 PDFs directly (commit `cf91dee`)
- Lesson: Don't over-engineer when the API supports it natively

### Cross-Sell Trigger Keywords
Vehicle: boat, motorcycle, ATV, UTV, golf cart, RV, camper, new car, teen driver  
Home: new house, renting, apartment, landlord, rental property, lake house, vacation home  
Life: married, baby, pregnant, retired  
Gaps: umbrella, life insurance, lapsed, canceled

---

## Process Discoveries

### Weekly Email Workflow
1. Export MTD production from AgencyZoom (Jan 1 - today)
2. Export this week's production (Mon - Fri)
3. Export MTD lead sources
4. Upload all three to `/email-updates`
5. Add announcements in Additional Context
6. Generate → Review → Copy HTML → Paste into Outlook

### Coaching Workflow
1. Select week in `/coaching`
2. Upload AgencyZoom CSV for metrics
3. Upload 3 Total Recall PDFs per producer
4. Generate episodes
5. Copy markdown to NotebookLM (Deep Dive, Long format)
6. Generate audio, send MP3 to producers

### Data Validation Checkpoints
- Always verify date ranges match between data sources
- Spot-check totals against AgencyZoom UI before trusting CSV imports
- If close rates seem off, check if TDS activity is MTD vs weekly

---

## Mistakes Made (Don't Repeat)

### 2026-01 Mistakes
- [ ] Tried calculating lead source close rates — impossible without source-level QHH
- [ ] Mixed MTD sales with weekly QHH in close rate calculation — garbage output
- [ ] Sent multi-feature prompt to Lovable — partial implementation, 2 hours lost
- [ ] Forgot type regeneration after adding email tables — TypeScript cascade
- [ ] Confused VC pace projection with % of target — different calculations
- [ ] Tried client-side PDF extraction instead of using Claude's native support
- [ ] Interface mismatch with database schema caused cascading type errors

### Anti-Patterns to Avoid
- Bundling SQL + frontend + testing in one Lovable prompt
- Trusting low-volume samples (< 5 quotes per segment)
- Assuming RLS works without testing producer login
- Drawing conclusions from TDS vs AgencyZoom without verifying date ranges
- Generating email without previous week context (breaks coaching rotation)
- Over-engineering PDF handling when API supports it natively
- Using unstable object references in useEffect dependencies
- Forgetting to clear role cache on sign-out

---

## Open Questions / Technical Debt

- [ ] Lead source close rates would require QHH-by-source tracking in TDS — future enhancement?
- [ ] Coaching transcripts stored in Supabase Storage — consider cleanup policy for old PDFs
- [ ] Email archive grows unbounded — add retention policy?
- [ ] ML integration planned but not started — quote-to-sale scoring, territory affinity

---

## Session Log Template

When completing a session, add entry below:

```
### YYYY-MM-DD — [Brief Title]
**What was done:**
- 

**What was learned:**
- 

**What to do differently:**
- 
```

---

### 2026-01-25 — Email Updates Feature Documentation
**What was done:**
- Reviewed tds-email-updates-documentation.md
- Updated CLAUDE.md with email feature (route, tables, components, edge function)
- Created LEARNINGS.md for institutional memory

**What was learned:**
- Email generation uses Opus (not Sonnet) for quality
- AgencyZoom Revenue column known bad — always use Premium
- Close Rate = Sales ÷ QHH, never calculate for lead sources (no source-level QHH)

**What to do differently:**
- Keep LEARNINGS.md updated after every session
- Reference it before starting new work

### 2026-01-25 — Coaching PDF Support & Data Merge
**What was done:**
- Fixed PDF extraction: Total Recall PDFs are image-based, switched to Claude native PDF support
- Merged TDS activity data (QHH, Quotes) with AgencyZoom production data (Sales, Items, Premium)
- Updated coaching Edge Function to fetch TDS data server-side
- Upgraded coaching model from Sonnet to Opus for flagship quality

**What was learned:**
- Total Recall call transcripts are image-based PDFs (screenshots), not text-based
- Claude's native PDF document support reads images directly — no OCR library needed
- Database CHECK constraints must be respected (extraction_status: pending|processing|completed|failed)
- QHH and Quotes come from TDS `quoted_households` table, not AgencyZoom

**What to do differently:**
- Check Claude API capabilities before building complex extraction pipelines
- Always verify database constraints before inserting values
- Use Opus for both coaching episodes and email generation (flagship quality standard)

### 2026-01-25 — Producer Dashboard Feature
**What was done:**
- Built producer-facing dashboard with motivational metrics (social comparison, loss aversion, streak protection)
- Components: ScorecardCard, TeamStandingsCard, PaceCard, StreakCard
- RPC function `get_producer_dashboard` returning JSON with scorecard, team standings, pace, VC countdown, streaks
- Bug fixes: workday calculation, framework streak logic, close rate column

**What was learned:**
- **Workday calculation requires actual business day math** — don't use `EXTRACT(DAY FROM date)` or hardcoded constants
- Use `generate_series` with `EXTRACT(DOW) NOT IN (0, 6)` for Mon-Fri only
- **Framework Streak = consecutive TOP OR BOTTOM days** (both = "in framework", not just TOP)
- Close rate color thresholds should be relative to agency average (~25%), not arbitrary cutoffs
- ≥30% = excellent (green), ≥22% = good (default), ≥15% = needs attention (yellow), <15% = critical (red)
- `entry_status` view has `framework_status` values: 'Top', 'Bottom', 'Outside' (capitalized)

**What to do differently:**
- Always verify placeholder implementations before assuming they work
- Test dashboard with real producer data, not just dev seed data
- Consider UI psychology: producer share % needs prominence to drive competition

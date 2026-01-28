# LEARNINGS.md - The Daily Standard (TDS)

> Institutional memory that compounds. Check before starting any task. Update after every session.
> Last updated: January 26, 2026

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
2. **Regenerate types immediately**:
   ```bash
   npx supabase gen types typescript --project-id trzeeacscqjklxnyvmnb --schema public > src/integrations/supabase/types.ts
   ```
3. Verify new tables/RPCs appear in types.ts
4. THEN prompt Lovable for frontend changes
- Skipping type regeneration causes cascading TypeScript errors
- **Lovable's dev build is lenient** — errors only surface in production build
- If Lovable adds `as any` casts, types are missing — regenerate first

### Supabase Project IDs
- **TDS App**: `trzeeacscqjklxnyvmnb`
- **NFv4**: `olnawnospfhsvfvbmlkm`
- Always use correct project ID — wrong ID returns "Your account does not have the necessary privileges" error
- Run `mcp__supabase__list_projects` if unsure which project ID to use

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

### 2026-01-26 — AI Pattern Detection System
**What was done:**
- Replaced Crystal's manual accountability review workflow with automated AI pattern detection
- Created `detected_patterns` table with 4 pattern types: low_conversion, source_failing, outside_streak, zero_item_streak
- Built `detect-patterns` Edge Function for nightly batch processing
- Added PatternInsightsPage for managers, AlertsCard for producer dashboard
- Removed ~4,000 lines of dead code from manual review system
- Scheduled pg_cron job for 11:30 PM CT daily
- Upgraded Supabase MCP from read-only postgres driver to official `@supabase/mcp-server-supabase` with write access

**What was learned:**
- **RLS policies must use correct table relationships** — `producers` table doesn't have `user_id`, link is through `profiles.producer_id`
- **`@modelcontextprotocol/server-postgres` is read-only** — use `@supabase/mcp-server-supabase` for write operations
- **Supabase access tokens vs service role keys**: Access token (sbp_*) = Management API for MCP; Service role key (JWT) = for Edge Functions
- Edge functions need service role key in Authorization header for pg_cron HTTP calls
- Pattern detection runs 11:30 PM CT = 5:30 AM UTC (cron: `30 5 * * *`)

**What to do differently:**
- Always verify table schema before writing RLS policies (`\d tablename` or check information_schema)
- Test RLS policies with actual user roles, not just service role
- For automated workflows, prefer Edge Functions + pg_cron over client-side scheduled tasks

### 2026-01-26 — Supabase Type Regeneration After RPCs
**What was done:**
- Added zip_failing pattern detection (new pattern type, RPC function, UI)
- Fixed migration history mismatch (37+ orphaned migrations marked as reverted)
- Regenerated types.ts after Lovable reported 11 build errors

**What was learned:**
- **Always regenerate types.ts after adding database objects** — Lovable's dev build doesn't enforce strict types
- 7 new RPC functions were missing from types.ts: get_failing_zips_v2, get_producer_patterns, get_all_active_patterns, etc.
- Lovable added `(supabase.rpc as any)` workarounds to fix build — proper fix is regenerating types
- Migration files must use YYYYMMDDHHMMSS format (not YYYYMMDD_name.sql) for Supabase CLI
- `supabase migration repair --status reverted <version>` cleans up orphaned remote migrations

**What to do differently:**
- After ANY database change: `npx supabase gen types typescript --project-id trzeeacscqjklxnyvmnb > src/integrations/supabase/types.ts`
- Always verify types.ts includes new RPCs before committing
- Run `npx tsc --noEmit` locally to catch errors before Lovable production build

### 2026-01-27 — CSR Dashboard Research Context
**What was done:**
- Created comprehensive markdown file for GPT Deep Research at `~/Desktop/CoffeyAgencies/AgencyOps/tds-csr-research-context.md`
- Documented full TDS database schema, user roles, producer tracking features
- Extracted CSR incentive program from Excel (5 activity types, point values, bonus pool structure)
- Identified existing CSR-adjacent data in TDS (lead sources, email_lead_source_metrics.is_csr_source)

**What was learned:**
- **CSR names are already lead sources in TDS**: Crystal, Kathy, Lexi exist in `sources` table
- **Partial CSR tracking exists**: `email_lead_source_metrics` has `is_csr_source` boolean and `attributed_to` field
- **Auto-calculation possible for referrals**: Quotes/sales with CSR lead_source_id can auto-calculate "Referral Closed/Quoted" points
- **Manual entry required for**: Google Reviews, Retention Saves (no TDS integration)
- **CSR bonus tiers in config**: `coaching_framework_config` has `email_csr_tiers` (0-4=$0, 5-9=$50, 10-14=$100, 15+=$150)
- **`sales_service` role exists but limited**: Only grants `/sales-service` page access, not CSR-specific features

**Key questions identified for research:**
- Should CSRs have daily targets or event-driven tracking?
- What's the ROI of building vs. continuing with Excel?
- How to handle Crystal's dual role (manager + CSR)?

**What to do differently:**
- When exploring new feature areas, document existing partial implementations first
- CSR data scattered across multiple tables — consolidation would help if building CSR features

### 2026-01-27 — CSR Dashboard Implementation Planning
**What was done:**
- Read comprehensive research doc (`/docs/framework-research-csr.md`) — 82k tokens of industry research
- Explored TDS auth/role system, database schema, and UI patterns
- Created detailed implementation plan at `/docs/csr-dashboard-implementation-plan.md`
- Identified 3-sprint roadmap: Core Dashboard → Activity Logging → Gamification

**What was learned:**
- **`app_role` SQL enum is out of sync with TypeScript** — TypeScript has `sales_service` but SQL enum doesn't
- **CSR source mapping already configured**: `coaching_framework_config.email_source_mappings` has Crystal/Kathy/Aleeah with `is_csr: true`
- **`email_lead_source_metrics.points` column exists** — but not calculated, just stores AgencyZoom raw value
- **Goal-Gradient Effect**: Progress bars toward goals increase motivation as users approach milestones
- **Overjustification Effect risk**: Adding too many extrinsic rewards can reduce intrinsic motivation
- **CSR activities are sporadic**: Unlike producers with daily metrics, CSRs may go weeks without earning points
- **Leaderboard design matters**: With only 3 CSRs, trailing person may give up — need encouragement messaging
- **Industry benchmark**: Top agencies get 250-300 referrals/year vs 12-15 average — huge opportunity

**Architecture decisions:**
- New `csr_profiles` table (separate from `producers`) — CSRs have different metrics
- New `csr_activities` table for all tracked activities (auto + manual)
- Auto-tracking via database trigger on `quoted_households` when lead_source is CSR
- Manual entry for: Google Reviews, Retention Saves, New Customer Referrals
- Crystal gets dual roles: `manager` + `csr` in `user_roles` table

**What to do differently:**
- Always check SQL enum values vs TypeScript types — they can drift
- When building gamification, balance extrinsic rewards with intrinsic motivation
- For small teams (3 CSRs), emphasize personal progress over pure competition

### 2026-01-28 — Coaching Dual-Mode (Sales + Service) & PDF Fix
**What was done:**
- Built dual-mode coaching system (Sales for producers, Service for CSRs)
- Added `coaching_type` discriminator column to all coaching tables
- Created CSR-specific scorecard (7 steps), focus rotation (6 weeks), episode template
- Fixed PDF upload: Reverted text extraction approach back to native PDF support
- Fixed sequential upload queue (parallel forEach → sequential for...of loop)

**What was learned:**
- **LEARNINGS.md is critical institutional memory** — the fix for PDF handling was already documented (commit `cf91dee`)
- **Don't repeat mistakes**: Client-side pdfjs-dist extraction failed before due to Vite worker configuration issues
- **Claude reads image-based PDFs natively** — Total Recall transcripts are screenshots, no OCR/text extraction needed
- **Sequential file uploads prevent race conditions** — parallel forEach caused reliability issues with multi-file uploads
- **Keep what works**: Retry logic with exponential backoff is valuable; sequential processing is valuable
- **Edge Function type narrowing**: Discriminated unions need explicit typing when building mixed arrays

**Database changes:**
- `coaching_transcripts.csr_profile_id` column added
- `coaching_episodes.csr_profile_id` column added
- `coaching_scores.coaching_type` column added
- New config types: `csr_scorecard`, `csr_cross_sell_triggers`, `csr_focus_rotation`, `csr_episode_template`, `csr_profiles`

**What to do differently:**
- **Always check LEARNINGS.md before implementing** — the PDF solution was documented 3 days ago
- **Don't over-engineer** — native API support beats complex client-side processing
- **Update LEARNINGS.md immediately after discovering solutions** — future sessions benefit from past learnings

### 2026-01-28 — Browser-Based PDF Compression FAILED
**What was attempted:**
- Implemented client-side PDF compression using pdfjs-dist + pdf-lib
- Goal: Compress large PDFs (25-50MB) before upload to prevent browser timeouts

**What FAILED:**
- **Canvas rendering produces 0-byte output** for Total Recall PDFs
- Console shows: `[Compress] Complete: 49.1MB → 0.0MB (100% reduction)` — this is wrong
- Result: Uploads "succeed" (0-byte file) but DB insert fails with CHECK constraint violation
- Error code `23514`: "new row for relation 'coaching_transcripts' violates check constraint"
- The `extraction_status` column has a CHECK constraint that rejects invalid values

**Root cause analysis:**
- pdfjs worker may not be loading correctly despite using Vite `import.meta.url` pattern
- Canvas renders blank pages (no pixel data) for image-based PDFs
- OR: pdfjs can't properly parse Total Recall's specific PDF format

**What was learned:**
- **Canvas rendering for image-based PDFs is unreliable** — pdfjs may not handle all PDF image formats
- **Validation saved us**: Added checks for `compressedSize < 1000` and `reductionPercent > 95%` to catch failures
- **The fallback works**: When compression throws, it uploads original (but original is too large → timeout)
- **Fresh-eyes review is critical**: Found 4 additional bugs in the code after initial implementation

**Current state (BROKEN):**
- CSR coaching UI works (service mode toggle, 7-step scorecard, 6-week rotation)
- Transcript upload is broken for large files
- Sales coaching still works (smaller PDFs don't hit compression threshold)

**Files involved:**
- `src/utils/pdfCompressor.ts` — canvas rendering produces empty output
- `src/hooks/useCoachingTranscripts.ts` — compression logic + fallback
- `src/components/coaching/TranscriptUploader.tsx` — UI shows "Failed" correctly

**What to try next:**
1. Debug why pdfjs renders blank canvases (check worker loading, PDF format compatibility)
2. Alternative: Server-side compression (Edge Function with different library)
3. Alternative: Increase Supabase upload timeout or use chunked uploads
4. Alternative: Ask user to compress PDFs before uploading (manual workaround)

### 2026-01-27 — CSR Dashboard Sprint 1 & 2 Implementation
**What was done:**
- Built complete CSR Dashboard with Sprint 1 (core UI) and Sprint 2 (activity logging)
- Database: `csr_profiles`, `csr_activities` tables, 3 RPCs, RLS policies
- Frontend: 6 components (`PeriodSelector`, `GoalProgressBar`, `PointsSummaryCard`, `CSRLeaderboard`, `ActivityLogForm`, `ActivityHistoryTable`)
- Hooks: `useCSRPoints`, `useCSRLeaderboard`, `useCSRActivities`
- Backfilled 11 activities from Jan 2026 QHH data + manual Excel reconciliation

**Key build decisions:**
- **source_id FK vs fuzzy matching**: User caught plan issue — original plan used LIKE matching on names ("Crystal%"). Fixed to use exact FK: `csr_profiles.source_id → sources.id`. Much more reliable for auto-tracking.
- **7 activity types (expanded from original 5)**:
  - Auto-tracked (from QHH): `referral_closed` (15 pts), `referral_quoted` (5 pts)
  - Manual entry: `google_review` (10), `retention_save` (10), `new_customer_referral` (10), `winback_closed` (10), `winback_quoted` (3)
- **Goal targets based on actual data, not theory**: 10 weekly / 40 monthly / 480 yearly — derived from team's real performance patterns, not arbitrary round numbers
- **Backfill 2026 only**: No 2025 data — cleaner start, avoids data quality issues from pre-system tracking

**Self-review caught 3 bugs:**
1. **Unused variable** (`canLogActivity` in CSRDashboardPage) — declared but never used
2. **Undefined boolean issue** (`isManager` could be `undefined` instead of `false`) — added `|| false` fallback
3. **State timing on points display** — success message briefly showed wrong points after form reset. Fixed with `lastEarnedPoints` state to preserve value during animation

**Database migration lessons:**
- PostgreSQL enum values can't be used in same transaction as `ALTER TYPE ADD VALUE` — split into separate migration
- `ON CONFLICT` requires explicit UNIQUE constraint — added `CONSTRAINT csr_activities_qhh_type UNIQUE (quoted_household_id, activity_type)`
- `coaching_framework_config.config_type` has CHECK constraint — had to ALTER to add 'csr_points_config'

**What to do differently:**
- **Always do a "fresh eyes" code review after completing a feature** — caught 3 bugs that would have hit production
- **When planning database features, verify constraint requirements upfront** — ON CONFLICT, CHECK constraints, enum timing
- **Use exact FK relationships for auto-tracking, never fuzzy string matching** — user feedback improved the design significantly

### 2026-01-28 — PDF Compression Fix with @quicktoolsone/pdf-compress
**What was done:**
- Replaced broken custom pdfCompressor.ts with `@quicktoolsone/pdf-compress` npm package
- Previous approach (pdfjs canvas rendering) produced 0-byte output for large (25-50MB) Total Recall PDFs
- New library auto-adapts DPI based on file size and handles memory cleanup automatically

**What was learned:**
- **Browser canvas rendering hits memory limits on large image-heavy PDFs** — pdfjs renders blank canvases
- **Don't reinvent the wheel** — @quicktoolsone/pdf-compress handles adaptive DPI, Web Workers, garbage collection
- **Proven libraries beat custom implementations** — the library is designed for exactly this use case (large scanned PDFs)
- Custom canvas rendering works for small PDFs but fails silently for large ones — validation catches the 0-byte output but can't fix it

**Root cause of original failure:**
- pdfjs `page.render()` succeeds but canvas pixels are blank (all zeros)
- `canvas.toBlob()` returns near-zero bytes
- Validation catches it but fallback to original still times out (file too large)

**What to do differently:**
- **Check LEARNINGS.md AND search npm before building custom solutions** — compression libraries already exist
- **Test with actual large files during development** — small test files may work while production files fail
- **Memory limits vary by device** — Mobile Safari and older browsers hit limits earlier

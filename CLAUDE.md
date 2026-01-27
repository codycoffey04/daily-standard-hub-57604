# CLAUDE.md - The Daily Standard (TDS)

> Last updated: January 26, 2026
> Repository: daily-standard-hub-57604

---

## What This Is

TDS is a sales performance tracking system for Coffey Agencies (Allstate insurance). Producers enter daily metrics, the system calculates framework status in real-time, and lead access is determined automatically. Managers get dashboards, reports, AI-powered coaching tools, and automated weekly emails.

### Users
- **Producers**: Maria Rocha-Guzman, Kimberly Fletcher, Rick Payne
- **Service Manager**: Crystal Brozio
- **Owner**: Cody Coffey
- **Support Staff**: Aleeah Stone, Stacey Freeman

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18.3 + TypeScript + Vite 5.4 |
| UI | shadcn/ui (Radix) + Tailwind CSS 3.4 |
| State | React Query (TanStack) + React Context |
| Database | Supabase PostgreSQL with RLS |
| Auth | Supabase Auth with role-based access |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| AI | Claude API — claude-sonnet-4-20250514 (coaching), claude-opus-4-20250514 (emails) |
| PDF | Claude native PDF support (no OCR) |

---

## The Framework (Core Business Logic)

### Daily Metric Thresholds

| Metric | Target | Type |
|--------|--------|------|
| Outbound Dials | 100+ | Effort |
| Talk Time | 180+ min | Effort |
| QHH (Quoted Households) | 4+ | **IMPACT** |
| Items Sold | 2+ | **IMPACT** |

### Framework Status

| Status | Criteria | Lead Access |
|--------|----------|-------------|
| **TOP** | ≥2 metrics met AND ≥1 impact metric | All leads (live transfers, call-ins, web) |
| **BOTTOM** | ≥2 metrics met but ONLY effort metrics | Web leads only |
| **OUTSIDE** | <2 metrics met | Lead Manager only |

**Key Rule**: You need at least one impact metric (QHH or Items) to reach TOP. Two effort-only = BOTTOM.

---

## Routes & Pages

| Route | Page | Access | Purpose |
|-------|------|--------|---------|
| `/login` | LoginPage | Public | Auth |
| `/producer` | HomePage | All authenticated | Daily entry form + status |
| `/team` | TeamPage | Owner/Manager | Team overview, leaderboard, monthly totals |
| `/coaching` | CoachingPage | Owner/Manager | Upload transcripts, generate AI episodes |
| `/email-updates` | EmailUpdatesPage | Owner/Manager | AI-generated weekly/monthly team emails |
| `/summaries` | SummariesPage | Owner/Manager | 20+ report types |
| `/insights` | PatternInsightsPage | Owner/Manager | AI-detected patterns + alerts |
| `/sources` | SourcesPage | Owner/Manager | Lead source + cost admin |
| `/importer` | ImporterPage | Owner/Manager | CSV import |
| `/sales-service` | SalesServicePage | sales_service role | Lead management |

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts with roles |
| `producers` | Producer master list |
| `daily_entries` | Daily metrics: dials, talk_minutes, qhh_total, items_total, sales_total, framework_status |
| `daily_entry_sources` | Metrics broken down by lead source per entry |
| `quoted_households` | Individual QHH records with zip, premium, product_lines, lead_source_id |
| `sales_from_old_quotes` | Sales from quotes older than same-day |
| `sources` | Lead source master list |
| `source_costs` | Monthly cost per source for ROI |
| `detected_patterns` | AI-detected performance patterns (auto-generated nightly) |

### Coaching Tables

| Table | Purpose |
|-------|---------|
| `coaching_transcripts` | Uploaded call PDFs |
| `coaching_episodes` | AI-generated coaching episodes |
| `coaching_scores` | 8-step scorecard per transcript |
| `coaching_metrics` | Weekly AgencyZoom metrics (sales, items, premium) |
| `coaching_framework_config` | Scorecard criteria, cross-sell triggers, 8-week rotation, producer profiles |

### Email Tables

| Table | Purpose |
|-------|---------|
| `email_metrics` | Weekly/monthly data snapshots (MTD producer metrics, weekly metrics, TDS activity) |
| `email_lead_source_metrics` | Lead source performance data by period |
| `email_updates` | Generated emails with HTML/markdown content, subject lines, comparison data |

### Key Views

| View | Purpose |
|------|---------|
| `entry_status` | Real-time framework status calculation |
| `yesterday_status` | Previous day performance |
| `premium_by_entry` | Premium totals per entry |

### Auth Tables

| Table | Purpose |
|-------|---------|
| `user_roles` | RBAC junction table |

---

## Key Database Functions (RPC)

| Function | Purpose |
|----------|---------|
| `calculate_framework_status` | Returns TOP/BOTTOM/OUTSIDE |
| `mtd_producer_metrics` | Month-to-date producer summary with VC pace |
| `get_producer_execution_leaderboard` | Ranked metrics with benchmarks |
| `get_execution_funnel` | Full funnel: dials→QHH→sold |
| `get_source_roi` | ROI calculation per lead source |
| `get_ytd_performance` | Year-to-date by month |
| `get_zip_performance` | Quotes/sales by ZIP |
| `get_common_weak_points` | Frequent review gaps |
| `get_coaching_effectiveness_metrics` | Coaching impact stats |
| `get_producer_trends_v3` | Daily producer data with sales |
| `get_weekly_coaching_trend` | Week-over-week coaching data |
| `get_my_roles` / `has_my_role` | RBAC helpers |

---

## File Structure

```
src/
├── pages/
│   ├── HomePage.tsx              # Producer daily entry
│   ├── TeamPage.tsx              # Team dashboard
│   ├── CoachingPage.tsx          # AI coaching
│   ├── EmailUpdatesPage.tsx      # AI-powered weekly emails
│   ├── SummariesPage.tsx         # Reports
│   ├── PatternInsightsPage.tsx      # AI pattern detection
│   ├── SourcesPage.tsx
│   ├── ImporterPage.tsx
│   ├── SalesServicePage.tsx
│   ├── LoginPage.tsx
│   ├── Index.tsx                 # Root redirect
│   └── NotFound.tsx              # 404 page
├── components/
│   ├── DailyEntryForm.tsx        # Daily entry form
│   ├── QuotedHouseholdForm.tsx   # QHH entry modal
│   ├── SaleFromOldQuoteForm.tsx  # Old quote sale modal
│   ├── YesterdayStatusBanner.tsx # Previous day status
│   ├── Leaderboard.tsx           # Team leaderboard
│   ├── MonthlyTotalsCard.tsx     # Monthly summary card
│   ├── PacingCard.tsx            # VC pacing display
│   ├── QHHDetailsCard.tsx        # QHH breakdown
│   ├── patterns/
│   │   ├── ActivePatternsCard.tsx    # Manager view of all patterns
│   │   └── AlertsCard.tsx            # Producer view of own patterns
│   ├── ErrorBoundary.tsx         # Global error boundary
│   ├── ThemeToggle.tsx           # Dark/light mode
│   ├── coaching/
│   │   ├── TranscriptUploader.tsx
│   │   ├── EpisodeGenerator.tsx
│   │   ├── EpisodeViewer.tsx
│   │   ├── ScoreBreakdown.tsx
│   │   ├── WeekSelector.tsx
│   │   ├── MetricsInput.tsx
│   │   ├── MetricsPreview.tsx
│   │   └── ProducerTranscriptPanel.tsx
│   ├── email-updates/
│   │   ├── PeriodSelector.tsx
│   │   ├── MetricsSummaryCard.tsx
│   │   ├── ProductionMetricsInput.tsx
│   │   ├── LeadSourceMetricsInput.tsx
│   │   ├── TDSActivityPreview.tsx
│   │   ├── EmailGenerator.tsx
│   │   ├── EmailPreview.tsx
│   │   └── EmailArchive.tsx
│   ├── charts/
│   │   ├── FrameworkTrendChart.tsx
│   │   ├── ActivityMetricsChart.tsx
│   │   ├── SalesPerformanceChart.tsx
│   │   ├── QHHTrendChart.tsx
│   │   ├── CloseRateChart.tsx
│   │   ├── SummaryBarChart.tsx
│   │   ├── ProducerSourceMatrix.tsx
│   │   ├── ProducerSourceMatrixQHHChart.tsx
│   │   └── ProducerSourceMatrixQuotesChart.tsx
│   ├── insights/
│   │   ├── ConversionFunnelCard.tsx
│   │   └── ProducerPerformanceCard.tsx
│   ├── reports/
│   │   ├── ReportSidebar.tsx
│   │   ├── ProducerTrendsDateFilter.tsx
│   │   ├── MonthlySummaryReport.tsx
│   │   ├── ExecutionFunnelReport.tsx
│   │   ├── ConversionFunnelReport.tsx
│   │   ├── ItemsByProducerReport.tsx
│   │   ├── ItemsBySourceReport.tsx
│   │   ├── QHHByProducerReport.tsx
│   │   ├── ProducerTrendsReport.tsx
│   │   ├── ProducerSourceMatrixReport.tsx
│   │   ├── ProducerSourceMatrixQHHReport.tsx
│   │   └── ProducerSourceMatrixQuotesReport.tsx
│   └── ui/                       # shadcn/ui components
├── hooks/
│   ├── useAnalyticsData.ts
│   ├── useSummariesData.ts
│   ├── useExecutionFunnel.ts
│   ├── useExecutionEfficiency.ts
│   ├── useProducerExecutionLeaderboard.ts
│   ├── useConversionFunnel.ts
│   ├── useMonthlySummary.ts
│   ├── useProducerTrends.ts
│   ├── useProducersForSelection.ts
│   ├── useQHHDetails.ts
│   ├── useZipPerformance.ts
│   ├── useSources.ts
│   ├── useSourcesForSelection.ts
│   ├── useSourceCosts.ts
│   ├── useDetectedPatterns.ts
│   ├── useCoachingTranscripts.ts
│   ├── useCoachingMetrics.ts
│   ├── useEpisodeGeneration.ts
│   ├── useWeeklyProducerSummary.ts
│   ├── useEmailMetrics.ts
│   ├── useEmailGeneration.ts
│   ├── useEmailLeadSources.ts
│   └── use-toast.ts
├── lib/
│   ├── auth.ts                   # Auth helpers
│   ├── constants.ts              # Product lines, etc.
│   ├── roles.ts                  # Role caching + RPC helpers
│   ├── timezone.ts               # Timezone utilities
│   └── utils.ts                  # General utilities (cn, etc.)
├── utils/
│   ├── pdfExtractor.ts           # PDF text extraction (legacy)
│   └── metricsParser.ts          # AgencyZoom CSV parsing
├── contexts/
│   └── AuthContext.tsx           # Auth state provider
└── integrations/
    └── supabase/
        ├── client.ts             # Supabase client
        └── types.ts              # Generated DB types

supabase/
└── functions/
    ├── generate-coaching-episode/
    │   └── index.ts              # claude-sonnet-4-20250514
    ├── generate-email-update/
    │   └── index.ts              # claude-opus-4-20250514
    └── detect-patterns/
        └── index.ts              # Nightly pattern detection (pg_cron @ 11:30 PM CT)
```

---

## Reports (20+ in reportConfig.ts)

**Performance Metrics:**
- Monthly Summary, Execution Funnel Dashboard, YTD Performance, ZIP Code Performance

**Lead Source Analysis:**
- QHH by Source, Quotes by Source, Items by Source, Source ROI Calculator

**Producer Analytics:**
- Weekly Producer Summary, QHH by Producer, Quotes by Producer
- Producer × Source Matrix (QHH/Quotes), Items by Producer, Sales by Producer, Producer Trends

**Accountability Insights:**
- Review Summary, Common Weak Points, Coaching Effectiveness

---

## AI Sales Coaching

### Data Flow
```
TDS Activity (QHH, Quotes)
        +
AgencyZoom CSV (Sales, Items, Premium)
        +
Total Recall PDFs (call transcripts)
        ↓
Edge Function (generate-coaching-episode)
        ↓
Claude Sonnet 4 API (claude-sonnet-4-20250514)
        ↓
8-Step Scorecard + Coaching Episode (markdown)
        ↓
NotebookLM → MP3
```

### 8-Step Sales Scorecard (0-2 scale, max 16)

| Step | What to Look For |
|------|------------------|
| 1. Opening | Rapport, introduction |
| 2. Discovery | Needs assessment |
| 3. Quoting | Presenting options |
| 4. Ask for Sale | Closing attempt |
| 5. Closing | Overcoming objections |
| 6. Follow-up | Next steps |
| 7. Multi-line | Cross-sell/bundle |
| 8. Referral Ask | Asked for referrals |

### 8-Week Focus Rotation (starts Jan 6, 2026)
1. Discovery & Needs Assessment
2. Bundling & Multi-Line
3. Asking for the Sale
4. Referral Generation
5. Objection Handling
6. Quote Volume & Activity
7. Cross-Sell Triggers
8. Value Before Price

### Cross-Sell Triggers Detected
- **Vehicle/Powersports**: boat, motorcycle, ATV, RV, new car, teen driver
- **Home/Property**: new house, renting, rental property, vacation home
- **Life Events**: married, baby, pregnant, retired
- **Coverage Gaps**: umbrella, life insurance, lapsed, canceled

---

## AI Email Generation

### Data Flow
```
AgencyZoom CSV (MTD Production + Weekly Production + Lead Sources)
        +
TDS Activity (QHH MTD, Quotes MTD per producer)
        ↓
Edge Function (generate-email-update)
        ↓
Claude Opus 4 API (claude-opus-4-20250514)
        ↓
Outlook-ready HTML + Markdown
```

### Email Sections (11 total)
1. Opening Hook
2. Production Table (with WoW deltas)
3. GA VC Pacing (76-item target)
4. Quotes & Close Rate Table
5. Lead Source Performance
6. Coaching Notes (rotates pressure weekly)
7. CSR Section (incentive tiers)
8. Life Insurance Update
9. Announcements
10. Week Focus (6-8 bullets)
11. Closing (LFG. 🔥)

### Key Formulas
- **Close Rate**: Sales MTD ÷ QHH MTD
- **Pipeline**: QHH MTD - Sales MTD
- **VC Pace**: (Current Items ÷ Days Elapsed) × Workdays in Month

### Data Source Hierarchy
| Data Type | Source | Priority |
|-----------|--------|----------|
| Production (Items, Premium, Sales) | AgencyZoom CSV | **Source of truth** |
| Lead Sources | AgencyZoom CSV | **Source of truth** |
| Activity (QHH, Quotes) | TDS | Secondary |

**Critical Rule:** AgencyZoom wins if conflicts exist with TDS data.

---

## AI Pattern Detection

Automated system that replaces manual accountability reviews. Runs nightly at 11:30 PM CT via pg_cron.

### Pattern Types

| Type | Severity | Trigger |
|------|----------|---------|
| `low_conversion` | critical | ≥8 QHH + 0 items in day |
| `source_failing` | warning | Same source 0 items for 3+ consecutive days |
| `outside_streak` | critical | 3+ consecutive OUTSIDE framework days |
| `zero_item_streak` | warning | 3+ consecutive 0-item days |

### Data Flow
```
pg_cron (11:30 PM CT / 5:30 AM UTC)
        ↓
Edge Function (detect-patterns)
        ↓
RPC functions scan daily_entries
        ↓
Insert to detected_patterns table
        ↓
Auto-resolve stale patterns (>7 days)
```

### Key RPC Functions
| Function | Purpose |
|----------|---------|
| `get_producer_patterns(uuid)` | Active patterns for one producer |
| `get_all_active_patterns()` | All team patterns (managers) |
| `get_source_failure_streaks(days)` | Sources with 0 items 3+ days |
| `get_outside_streaks(days)` | OUTSIDE framework streaks |
| `get_zero_item_streaks(days)` | Zero-item day streaks |
| `resolve_pattern(uuid, bool)` | Mark pattern resolved |

### UI Components
- **Managers**: PatternInsightsPage (`/insights`) with ActivePatternsCard
- **Producers**: AlertsCard on producer dashboard (only shows if patterns exist)

---

## Auth & Roles

**Roles**: `owner` | `manager` | `producer` | `reviewer` | `sales_service`

**Role Routing:**
- Owner/Manager → `/team`
- Reviewer → `/accountability`
- Sales Service → `/sales-service`
- Producer → `/producer`

**RLS**: Row-level security via `profiles.role` + RPC functions `get_my_roles()`, `has_my_role()`

---

## Product Lines

```
Standard Auto, Home, Landlords, Renters, Motorcycle,
Manufactured Home, Boat, Umbrella, Condominium, Motor Club
```

---

## External Integrations

| System | Usage |
|--------|-------|
| Claude API | Coaching (claude-sonnet-4-20250514), Emails (claude-opus-4-20250514) |
| Supabase Storage | PDF storage (`coaching-transcripts` bucket) |
| AgencyZoom | Sales/items/premium data (CSV upload) |
| NotebookLM | Audio generation from coaching markdown |

---

## Secrets Required

In Supabase secrets:
- `ANTHROPIC_API_KEY` — for coaching and email generation

---

## Conventions

### Naming
- **Framework status**: `TOP`, `BOTTOM`, `OUTSIDE` (uppercase)
- **Database columns**: snake_case
- **JS variables**: camelCase
- **Date format**: ISO (YYYY-MM-DD)

### Colors
- **Green (#10B981)**: TOP / Good
- **Yellow (#F59E0B)**: BOTTOM / Warning
- **Red (#EF4444)**: OUTSIDE / Critical
- **Blue (#3B82F6)**: Informational

---

## Context for Claude

- Focus on actionable, data-driven insights
- Reference specific producer names and patterns
- Consider ROI implications of lead source decisions
- Think about framework compliance vs actual results nuance
- Keep responses tight, outcome-driven, no fluff
- See LEARNINGS.md for mistakes to avoid and patterns that work

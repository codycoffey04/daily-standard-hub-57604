# CLAUDE.md - The Daily Standard (TDS) Project

## Project Overview

**The Daily Standard (TDS)** is a sales performance tracking system for Cody's insurance agency. It replaces manual JotForm + Google Sheets workflows with automated real-time performance tracking and accountability management.

### Purpose
Implement the "Daily Standard Framework" - a performance-based lead access system where producers must achieve specific daily metrics to maintain lead access levels. The system drives accountability, enables data-driven decisions, and optimizes ROI across lead sources and territories.

### Who It Serves
- **Producers**: Maria Rocha-Guzman, Kimberly Fletcher, Rick Payne (active)
- **Accountability Manager**: Crystal Brozio (reviews producer performance)
- **Admin/Owner**: Cody (oversight, reporting, ROI analysis)
- **Support Staff**: Aleeah Stone, Stacey Freeman

---

## The Daily Standard Framework (CRITICAL BUSINESS LOGIC)

### Performance Tiers & Lead Access

| Status | Criteria | Lead Access |
|--------|----------|-------------|
| **TOP** | Met 2/4 metrics WITH at least 1 impact metric | All leads (live transfers, call-ins, web) |
| **BOTTOM** | Met 2/4 metrics but ONLY effort metrics | Web leads only |
| **OUTSIDE** | Did not meet 2/4 metrics | Lead Manager only |

### Daily Metric Thresholds
1. **100+ outbound dials** (effort)
2. **180+ minutes talk time** (effort)
3. **4+ quoted households** (IMPACT)
4. **2+ items sold** (IMPACT)

### Framework Status Calculation
```javascript
const calculateFrameworkStatus = (metrics) => {
  const checks = {
    dials: metrics.dials >= 100,
    talkTime: metrics.talkTime >= 180,
    quotedHH: metrics.quotedHH >= 4,
    itemsSold: metrics.itemsSold >= 2
  };
  
  const metCount = Object.values(checks).filter(v => v).length;
  const hasImpactMetric = checks.quotedHH || checks.itemsSold;
  
  if (metCount >= 2 && hasImpactMetric) return 'TOP';
  if (metCount >= 2) return 'BOTTOM';
  return 'OUTSIDE';
};
```

**Key Rule**: Impact metrics (Quoted HH, Items Sold) are required to reach TOP status. Two effort-only metrics = BOTTOM.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Lovable (React-based) |
| **Database** | Supabase PostgreSQL with Row Level Security |
| **Auth** | Supabase Auth |
| **Data Migration** | Node.js + PapaParse |
| **Source Data** | JotForm CSVs (legacy) |
| **Sales Validation** | Agency Zoom integration |
| **Code Analysis** | Cursor AI, Claude Code |

---

## Key Files & Structure

### Data Transformation
| File | Purpose |
|------|---------|
| `jotform-transformation-scripts.js` | Transforms raw JotForm CSV data into clean format for Supabase |
| `supabase-import-scripts.sql` | SQL scripts for database schema and data import |
| `run-migration-script.sh` | Shell script to automate the full migration process |

### Source Data (Legacy)
| File | Purpose |
|------|---------|
| `the_daily_standard_jotform.csv` | Producer daily activity submissions (dials, talk time, quotes, sales) |
| `crystal_to_cody_jotform.csv` | Manager reviews and coaching notes |

### Documentation
| File | Purpose |
|------|---------|
| `daily_standard_framework_final.docx` | Official business rules for the framework |
| `lovable-detailed-plan.md` | Full development plan with database schema, UI specs, workflows |

### Screenshots (Reference)
| File | Shows |
|------|-------|
| `form_responses.png` | Raw JotForm data structure |
| `lead_sources_az.png` | Agency Zoom lead source report |
| `nb_producer_az.png` | Agency Zoom producer sales data |
| `report_options_az.png` | Available Agency Zoom reports |
| `totalquotes_*.png` | Monthly quote analysis views |

---

## Database Schema (Core Tables)

```sql
-- User/Producer profiles
profiles (id, full_name, role, email, phone, active)

-- Daily activity entries
daily_activities (id, producer_id, activity_date, outbound_dials, 
                  talk_time_minutes, quoted_households, items_sold,
                  framework_status, lead_access, notes)

-- Individual quote details
quotes (id, activity_id, customer_name, phone, lead_source, 
        products_quoted, status, premium, notes)

-- Lead source master list with costs
lead_sources (id, name, type, monthly_cost, is_active)

-- Manager review records
manager_reviews (id, activity_id, reviewer_id, call_reviewed,
                 sales_process_gaps, coaching_notes, follow_up_required)

-- Monthly ROI metrics
monthly_metrics (id, lead_source_id, month, total_leads, total_quotes,
                 total_sales, total_revenue, cost)
```

---

## Development Workflow

### Running Data Migration
```bash
# 1. Install dependencies
npm install papaparse @supabase/supabase-js

# 2. Run transformation
node jotform-transformation-scripts.js

# 3. Import to Supabase
# - Use Supabase Dashboard CSV import, OR
# - Run supabase-import-scripts.sql in SQL Editor
```

### Framework Status Updates
- Calculate in real-time as metrics are entered
- Update lead_access field based on status
- Show visual feedback (green/yellow/red) for tier

### Data Validation Rules
- Outbound dials: ≥ 0
- Talk time: ≥ 0 minutes
- Quoted households: ≥ 0
- Items sold: ≥ 0, cannot exceed quoted households
- Activity date: Required, valid date
- Producer name: Required

---

## MCP Servers & Integrations

| Integration | Purpose |
|-------------|---------|
| **JotForm MCP** | Access to form submissions (connected) |
| **Agency Zoom** | Sales data validation, policy details |
| **Supabase** | Database operations |
| **Google Drive** | Document storage for reports |

---

## Conventions

### Naming Patterns
- **Framework status**: `TOP`, `BOTTOM`, `OUTSIDE` (uppercase)
- **Lead access**: Full descriptive strings ("All Leads...", "Web Leads Only", etc.)
- **Database columns**: snake_case
- **JS variables**: camelCase
- **Date format**: ISO (YYYY-MM-DD)
- **Phone format**: 10 digits, cleaned of non-numeric

### Color Coding
- **Green (#10B981)**: TOP / Good / Met threshold
- **Yellow (#F59E0B)**: BOTTOM / Warning
- **Red (#EF4444)**: OUTSIDE / Critical / Below threshold
- **Blue (#3B82F6)**: Informational

### Lead Sources (Standardized Names)
- Net Lead (paid, $10k/mo)
- Digital Marketing (paid, $2k/mo)
- Direct Mail (paid)
- CLICK AD (paid)
- Live Transfer (paid)
- Call-In - Existing (organic)
- Call-In - NEW (organic)
- Walk-In (organic)
- Customer Referral (organic)
- Lead Manager (organic)
- Cross-Sale (organic)
- DM Rome, DM Centre (direct mail variants)

---

## Current State

### What's Working
- JotForm data transformation scripts
- Framework status calculation logic
- Database schema design
- CSV migration pipeline
- Manager review data structure

### In Progress
- TDS app in Lovable (production use)
- Role-based access control
- Coaching effectiveness dashboards
- Real-time framework status updates

### Known Issues / Considerations
- Framework compliance doesn't always correlate with actual sales (Kimberly example)
- Data discrepancies between TDS and Agency Zoom require validation
- Brandy Wilkins terminated Dec 2024 - historical data remains
- Geographic performance varies (359xx area codes strong, Atlanta metro weak)

---

## Context for Claude

### Key Business Insights
1. **Impact metrics matter most** - Sales (items sold) and quotes (households) drive TOP status
2. **Net Lead is the primary paid source** - $10k/mo, needs ROI monitoring
3. **Producer territory affinity** - Different producers perform better in different regions
4. **Friday emails** - Weekly performance summaries sent to team with metrics + motivation

### When Helping Cody
- Focus on actionable, data-driven insights
- Reference specific producer names and their patterns
- Consider ROI implications of lead source decisions
- Maintain data integrity between systems
- Think about framework compliance vs actual results nuance

### Common Tasks
- Analyzing producer performance by lead source
- Calculating ROI metrics for lead sources
- Building reports for Friday emails
- Debugging data discrepancies
- Creating dashboard visualizations
- Optimizing territory assignments

### Data Sources to Cross-Reference
- TDS daily submissions → framework compliance
- Agency Zoom → actual sales/policies
- Lead source costs → ROI calculations
- Geographic data (zip codes) → territory optimization

---

## Quick Reference Commands

```javascript
// Calculate framework status
calculateFrameworkStatus({ dials: 120, talkTime: 200, quotedHH: 5, itemsSold: 3 })
// Returns: 'TOP'

// Determine lead access
determineLeadAccess('TOP') // 'All Leads (Live transfers, Call-ins, Web)'
determineLeadAccess('BOTTOM') // 'Web Leads Only'
determineLeadAccess('OUTSIDE') // 'Lead Manager Only'
```

```sql
-- Check framework distribution
SELECT framework_status, COUNT(*) FROM daily_activities GROUP BY framework_status;

-- Producer performance summary
SELECT p.full_name, AVG(da.quoted_households), AVG(da.items_sold)
FROM daily_activities da JOIN profiles p ON p.id = da.producer_id
GROUP BY p.full_name;

-- Lead source ROI
SELECT lead_source, COUNT(*) quotes, 
       COUNT(CASE WHEN status = 'Sold' THEN 1 END) sales
FROM quotes GROUP BY lead_source;
```

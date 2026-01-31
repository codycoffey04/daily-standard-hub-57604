# Coaching Dashboard Card Spec

> Feature request evaluation for surfacing coaching insights on producer/CSR dashboards
> Evaluated: January 31, 2026
> **Status: IMPLEMENTED**

---

## 1. Technical Feasibility Assessment

### Summary: ✅ Feasible with one new RPC function

The current coaching system has solid foundations for this feature. Week tracking via ISO dates, focus themes, and step-level scoring are all in place. The main gap is **week-over-week comparison** — no existing function compares scores between weeks.

### What Already Exists

| Capability | Status | Location |
|-----------|--------|----------|
| Step averages calculation | ✅ Ready | `ScoreBreakdown.tsx` |
| Strongest/weakest step ID | ✅ Ready | `ScoreBreakdown.tsx` |
| Focus theme storage | ✅ Ready | `coaching_episodes.focus_theme` |
| Focus week number | ✅ Ready | `coaching_episodes.focus_week_number` |
| Week identification | ✅ Ready | `week_start`, `week_end` fields |
| Episode lookup by member | ✅ Ready | `producer_id` / `csr_profile_id` FK |
| Week-over-week comparison | ❌ Missing | Needs new RPC function |

### Focus Theme Source
The `coaching_episodes.focus_theme` field stores the weekly focus (e.g., "Discovery & Needs Assessment"). This is set during episode generation based on the 8-week rotation schedule stored in `coaching_framework_config`.

**The "challenge" text** (specific action for the week) is stored in the config but **not currently on the episode**. Options:
1. Join to config on each load (more overhead)
2. Denormalize by adding `focus_challenge` column to episodes (recommended)

---

## 2. Data Model Changes Needed

### Required: New RPC Function

```sql
CREATE OR REPLACE FUNCTION get_coaching_score_comparison(
  p_member_id UUID,
  p_coaching_type TEXT,  -- 'sales' or 'service'
  p_is_csr BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_episode RECORD;
  v_previous_episode RECORD;
  v_current_scores JSON;
  v_previous_scores JSON;
  v_result JSON;
BEGIN
  -- Find most recent published episode for member
  -- Find previous week's episode if exists
  -- Calculate averages per step for each
  -- Compute deltas
  -- Return structured JSON
END;
$$;
```

**Returns structure:**
```json
{
  "current_week": {
    "week_start": "2026-01-27",
    "overall_avg": 1.1,
    "step_averages": {
      "step_1_opening": 1.6,
      "step_2_discovery": 1.8,
      "step_3_quoting": 1.4,
      "step_4_ask_for_sale": 0.8,
      "step_5_closing": 1.0,
      "step_6_follow_up": 1.2,
      "step_7_multi_line": 0.6,
      "step_8_referral_ask": 0.4
    },
    "strongest_step": "step_2_discovery",
    "weakest_step": "step_8_referral_ask",
    "focus_theme": "Discovery & Needs Assessment",
    "focus_challenge": "Ask 'What's prompting you to look at insurance today?' on every quote call",
    "transcript_count": 5
  },
  "previous_week": {
    "week_start": "2026-01-20",
    "overall_avg": 0.8,
    "step_averages": { ... },
    "strongest_step": "step_1_opening",
    "weakest_step": "step_8_referral_ask"
  },
  "delta": {
    "overall": 0.3,
    "improved_steps": ["step_2_discovery", "step_4_ask_for_sale"],
    "declined_steps": ["step_1_opening"]
  }
}
```

### Required: Performance Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_coaching_episodes_producer_week
ON coaching_episodes(producer_id, week_start DESC)
WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_coaching_episodes_csr_week
ON coaching_episodes(csr_profile_id, week_start DESC)
WHERE status = 'published';
```

### Optional: Focus Challenge Column

```sql
ALTER TABLE coaching_episodes
ADD COLUMN focus_challenge TEXT;
```

Then update `generate-coaching-episode` Edge Function to populate this during generation.

---

## 3. Recommended Implementation Approach

### Phase 1: Database Layer
1. Create `get_coaching_score_comparison` RPC function
2. Add performance indexes
3. (Optional) Add `focus_challenge` column
4. Regenerate Supabase types

### Phase 2: React Hook

**File:** `src/hooks/useCoachingDashboardCard.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CoachingDashboardData {
  currentWeek: WeekData | null;
  previousWeek: WeekData | null;
  delta: DeltaData | null;
}

interface WeekData {
  weekStart: string;
  overallAvg: number;
  stepAverages: Record<string, number>;
  strongestStep: string;
  weakestStep: string;
  focusTheme: string;
  focusChallenge?: string;
  transcriptCount: number;
}

interface DeltaData {
  overall: number;
  improvedSteps: string[];
  declinedSteps: string[];
}

export function useCoachingDashboardCard(
  memberId: string | undefined,
  coachingType: 'sales' | 'service',
  isCsr: boolean = false
) {
  return useQuery({
    queryKey: ['coaching-dashboard-card', memberId, coachingType, isCsr],
    queryFn: async (): Promise<CoachingDashboardData | null> => {
      if (!memberId) return null;

      const { data, error } = await supabase.rpc('get_coaching_score_comparison', {
        p_member_id: memberId,
        p_coaching_type: coachingType,
        p_is_csr: isCsr
      });

      if (error) throw error;
      return data as CoachingDashboardData;
    },
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Phase 3: UI Component

**File:** `src/components/coaching/CoachingDashboardCard.tsx`

**Visual Layout:**
```
┌─────────────────────────────────────────┐
│ 📊 Coaching Scorecard                   │
│ Week of Jan 27 • Discovery Focus        │
├─────────────────────────────────────────┤
│ Overall Average                         │
│ 1.1/2  ↑ 0.3                           │
│        (green arrow, +38% text)         │
├─────────────────────────────────────────┤
│ ✅ Strongest: Discovery (1.8)           │
│ ⚠️ Needs Work: Referral Ask (0.4)       │
├─────────────────────────────────────────┤
│ Step Averages              [Expand ▼]   │
│ Opening     ████████░░ 1.6              │
│ Discovery   █████████░ 1.8              │
│ Quoting     ███████░░░ 1.4              │
│ (collapsed by default, show top 3)      │
├─────────────────────────────────────────┤
│ 🎯 Focus This Week                      │
│ "Ask 'What's prompting you to look at   │
│  insurance today?' on every quote call" │
└─────────────────────────────────────────┘
```

**Component Props:**
```typescript
interface CoachingDashboardCardProps {
  memberId: string;
  memberName: string;
  coachingType: 'sales' | 'service';
  isCsr?: boolean;
}
```

**Conditional Rendering:**
- Return `null` if no data (no published episodes)
- Show skeleton while loading
- Gracefully handle missing previous week (no delta shown)

### Phase 4: Dashboard Integration

**Producer Dashboard** (`src/components/producer-dashboard/ProducerDashboard.tsx`):
```tsx
// After AlertsCard, before ScorecardCard
{currentProducerId && (
  <CoachingDashboardCard
    memberId={currentProducerId}
    memberName={producerName}
    coachingType="sales"
    isCsr={false}
  />
)}
```

**CSR Dashboard** (`src/pages/CSRDashboardPage.tsx`):
```tsx
// In right column, after ActivityLogForm
{profile?.id && (
  <CoachingDashboardCard
    memberId={profile.id}
    memberName={profile.name}
    coachingType="service"
    isCsr={true}
  />
)}
```

---

## 4. Optimizations & Concerns

### Performance
- **Single RPC call** per dashboard load (not multiple queries)
- **Proper indexes** on producer_id/csr_profile_id + week_start
- **React Query caching** with 5-minute stale time
- **Conditional fetching** — only when member ID exists

### Real Estate
- **Sidebar constraint**: ~400px width on desktop
- **Solution**: Collapsible step averages section (show top 3 by default)
- **Mobile**: Full-width stacking works well with horizontal bars

### Edge Cases Handled
| Scenario | Behavior |
|----------|----------|
| First week coached | Show current week only, no delta |
| No episodes exist | Card doesn't render |
| Week with 0 transcripts | Show "No calls scored" message |
| Mid-week partial data | Show current data with transcript count |

### Service Mode Differences
CSR coaching uses a different scorecard:
- **7 steps** (no "Ask for Sale")
- **6-week rotation** (vs 8-week for sales)
- **Additional tracking**: Google Review ask rate, Life Insurance opportunities

Component should adapt based on `coachingType` prop.

---

## 5. Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/YYYYMMDD_coaching_dashboard_support.sql` | RPC function + indexes |
| `src/hooks/useCoachingDashboardCard.ts` | Data fetching hook |
| `src/components/coaching/CoachingDashboardCard.tsx` | Card component |

### Modified Files
| File | Change |
|------|--------|
| `src/components/producer-dashboard/ProducerDashboard.tsx` | Add card to sidebar |
| `src/pages/CSRDashboardPage.tsx` | Add card to right column |
| `src/integrations/supabase/types.ts` | Regenerate after migration |
| `supabase/functions/generate-coaching-episode/index.ts` | (Optional) Populate `focus_challenge` |

---

## 6. Verification Checklist

### Functional Testing
- [ ] Card appears when published episode exists
- [ ] Card hidden when no episodes exist
- [ ] Overall average displays correctly
- [ ] Strongest/weakest steps identified correctly
- [ ] Week-over-week delta calculates correctly
- [ ] Focus theme and challenge display correctly
- [ ] Collapsible step averages work
- [ ] Service mode shows 7 steps (not 8)

### Edge Case Testing
- [ ] First week coached (no previous week)
- [ ] Week with 0 transcripts
- [ ] Mid-week data (partial scores)
- [ ] Multiple producers on same dashboard
- [ ] CSR dashboard with Aleeah

### Performance Testing
- [ ] Dashboard load time acceptable (<500ms)
- [ ] No N+1 queries
- [ ] Caching works (no refetch on tab switch)

---

## 7. Decision Points for Review

1. **Focus challenge text**: Store on episode (denormalized) or join to config each time?
   - Recommendation: Denormalize for simplicity

2. **Step averages display**: Show all 8 steps or collapsible?
   - Recommendation: Collapsible, show top 3 by default

3. **Delta threshold**: What delta is significant enough to highlight?
   - Recommendation: Any non-zero delta gets arrow, ≥0.3 gets special color

4. **Refresh frequency**: How often should data refresh?
   - Recommendation: 5-minute stale time, manual refresh button optional

---

---

## Implementation Summary (Completed Jan 31, 2026)

### Files Created
| File | Purpose |
|------|---------|
| `supabase/migrations/20260131000001_coaching_dashboard_support.sql` | RPC function + indexes + focus_challenge column |
| `src/hooks/useCoachingDashboardCard.ts` | React Query hook for fetching coaching data |
| `src/components/coaching/CoachingDashboardCard.tsx` | Card component with score visualization |

### Files Modified
| File | Change |
|------|--------|
| `src/components/producer-dashboard/ProducerDashboard.tsx` | Added CoachingDashboardCard after AlertsCard |
| `src/pages/HomePage.tsx` | Pass producerName prop to ProducerDashboard |
| `src/pages/CSRDashboardPage.tsx` | Added CoachingDashboardCard after ActivityLogForm |
| `supabase/functions/generate-coaching-episode/index.ts` | Populate focus_challenge field |
| `src/integrations/supabase/types.ts` | Regenerated with new RPC and column |

### Key Implementation Decisions
1. **Desktop only** — No mobile responsive adjustments
2. **Current week only** — Card only shows if episode exists for current week
3. **All steps visible** — No collapsing, scrollable if needed
4. **focus_challenge stored on episode** — Denormalized for performance
5. **Google Review Rate** — Separate KPI metric for service coaching (not a step)

### Testing Notes
- Card will not appear until a coaching episode is generated for the current week
- To test, generate a new coaching episode via /coaching page
- Week-over-week delta only shows if previous week's episode also exists

---

## Appendix: Existing Step Names

### Sales Scorecard (8 steps)
1. Opening — Rapport, introduction
2. Discovery — Needs assessment
3. Quoting — Presenting options
4. Ask for Sale — Closing attempt
5. Closing — Overcoming objections
6. Follow-up — Next steps
7. Multi-line — Cross-sell/bundle
8. Referral Ask — Asked for referrals

### Service Scorecard (7 steps)
1. Greeting — Professional intro
2. Listening/Empathy — Understanding concern
3. Problem Identification — Root cause
4. Resolution — Solving the issue
5. Cross-Sell — Mentioning additional products
6. Referral Ask — Asked for referrals
7. Retention — Policy value reinforcement

# CSR Dashboard Implementation Plan

> Created: January 27, 2026
> Based on: `/docs/framework-research-csr.md`

---

## Executive Summary

Build a CSR (Customer Service Representative) dashboard within TDS to track performance points, display leaderboards, and gamify engagement for Crystal, Kathy, and Aleeah.

**Point Values (from existing incentive program):**
| Activity | Points | Tracking |
|----------|--------|----------|
| Referral Closed (CSR referral → sold) | 15 | Auto |
| Referral Quoted (CSR referral → quoted) | 5 | Auto |
| Google Review collected | 10 | Manual |
| Retention Save | 10 | Manual |
| New Customer Referral | 10 | Manual |

---

## Phase 1: Database Schema

### 1.1 Migration: Add CSR Role

```sql
-- File: supabase/migrations/YYYYMMDDHHMMSS_csr_dashboard.sql

-- Add 'csr' to app_role enum (currently only: owner, manager, producer, reviewer)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'csr';
```

### 1.2 New Table: `csr_profiles`

```sql
CREATE TABLE public.csr_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.sources(id),  -- Links CSR to their lead source for auto-tracking
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT csr_profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT csr_profiles_source_id_key UNIQUE (source_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_csr_profiles_user_id ON public.csr_profiles(user_id);
CREATE INDEX idx_csr_profiles_source_id ON public.csr_profiles(source_id);

-- RLS: Authenticated users can view all CSR profiles (needed for leaderboard)
ALTER TABLE public.csr_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view CSR profiles"
ON public.csr_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owner/Manager can manage CSR profiles"
ON public.csr_profiles FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('owner', 'manager')
  )
);
```

### 1.3 New Table: `csr_activities`

```sql
CREATE TABLE public.csr_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  csr_profile_id UUID NOT NULL REFERENCES public.csr_profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'referral_closed',      -- 15 pts
    'referral_quoted',      -- 5 pts
    'google_review',        -- 10 pts
    'retention_save',       -- 10 pts
    'new_customer_referral' -- 10 pts
  )),
  points INTEGER NOT NULL,
  activity_date DATE NOT NULL,

  -- For auto-tracked referrals, link to source record
  quoted_household_id UUID REFERENCES public.quoted_households(id) ON DELETE SET NULL,

  -- For manual entries
  customer_name TEXT,
  notes TEXT,

  -- Tracking source
  source TEXT NOT NULL CHECK (source IN ('auto', 'manual')),

  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Unique constraint for idempotent upserts (prevents duplicate auto-tracking)
ALTER TABLE public.csr_activities
  ADD CONSTRAINT csr_activities_qhh_type UNIQUE (quoted_household_id, activity_type);

-- Performance indexes
CREATE INDEX idx_csr_activities_profile ON public.csr_activities(csr_profile_id);
CREATE INDEX idx_csr_activities_date ON public.csr_activities(activity_date);
CREATE INDEX idx_csr_activities_type ON public.csr_activities(activity_type);
CREATE INDEX idx_csr_activities_qhh ON public.csr_activities(quoted_household_id)
  WHERE quoted_household_id IS NOT NULL;

-- RLS
ALTER TABLE public.csr_activities ENABLE ROW LEVEL SECURITY;

-- CSRs, managers, and owners can view all activities
CREATE POLICY "Role-based view of CSR activities"
ON public.csr_activities FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('csr', 'owner', 'manager')
  )
);

-- CSRs can insert their own activities
CREATE POLICY "CSRs can insert own activities"
ON public.csr_activities FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.csr_profiles cp
    WHERE cp.id = csr_profile_id AND cp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('owner', 'manager')
  )
);

-- Only owner/manager can update/delete
CREATE POLICY "Owner/Manager can manage activities"
ON public.csr_activities FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Owner/Manager can delete activities"
ON public.csr_activities FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('owner', 'manager')
  )
);
```

### 1.4 New Table: `csr_badges` (Sprint 3)

```sql
CREATE TABLE public.csr_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  csr_profile_id UUID NOT NULL REFERENCES public.csr_profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT csr_badges_unique UNIQUE (csr_profile_id, badge_type)
);

ALTER TABLE public.csr_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view badges"
ON public.csr_badges FOR SELECT TO authenticated USING (true);
```

### 1.5 Points Configuration (in coaching_framework_config)

```sql
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'csr_points_config',
  '{
    "points": {
      "referral_closed": 15,
      "referral_quoted": 5,
      "google_review": 10,
      "retention_save": 10,
      "new_customer_referral": 10
    },
    "goals": {
      "weekly": 10,
      "monthly": 40,
      "yearly": 480
    },
    "badges": [
      {"type": "first_blood", "name": "First Blood", "description": "First point of the year", "icon": "Award"},
      {"type": "hat_trick", "name": "Hat Trick", "description": "3 referrals in one week", "icon": "Trophy"},
      {"type": "super_saver", "name": "Super Saver", "description": "5 retention saves", "icon": "Shield"},
      {"type": "review_master", "name": "Review Master", "description": "10 Google reviews", "icon": "Star"},
      {"type": "consistency", "name": "Consistent Contributor", "description": "4 consecutive weeks with activity", "icon": "Flame"}
    ]
  }'::jsonb,
  true,
  1
);
```

### 1.6 RPC Functions

```sql
-- Get CSR points summary for a period
CREATE OR REPLACE FUNCTION public.get_csr_points_summary(
  p_period TEXT DEFAULT 'ytd',  -- 'week', 'month', 'ytd'
  p_csr_profile_id UUID DEFAULT NULL
)
RETURNS TABLE (
  csr_profile_id UUID,
  csr_name TEXT,
  referral_closed_pts INTEGER,
  referral_quoted_pts INTEGER,
  google_review_pts INTEGER,
  retention_save_pts INTEGER,
  new_customer_referral_pts INTEGER,
  total_points INTEGER,
  activity_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
BEGIN
  -- Calculate start date based on period
  v_start_date := CASE p_period
    WHEN 'week' THEN date_trunc('week', CURRENT_DATE)::DATE
    WHEN 'month' THEN date_trunc('month', CURRENT_DATE)::DATE
    ELSE date_trunc('year', CURRENT_DATE)::DATE  -- ytd
  END;

  RETURN QUERY
  SELECT
    cp.id AS csr_profile_id,
    cp.display_name AS csr_name,
    COALESCE(SUM(CASE WHEN ca.activity_type = 'referral_closed' THEN ca.points END), 0)::INTEGER,
    COALESCE(SUM(CASE WHEN ca.activity_type = 'referral_quoted' THEN ca.points END), 0)::INTEGER,
    COALESCE(SUM(CASE WHEN ca.activity_type = 'google_review' THEN ca.points END), 0)::INTEGER,
    COALESCE(SUM(CASE WHEN ca.activity_type = 'retention_save' THEN ca.points END), 0)::INTEGER,
    COALESCE(SUM(CASE WHEN ca.activity_type = 'new_customer_referral' THEN ca.points END), 0)::INTEGER,
    COALESCE(SUM(ca.points), 0)::INTEGER AS total_points,
    COUNT(ca.id) AS activity_count
  FROM public.csr_profiles cp
  LEFT JOIN public.csr_activities ca
    ON ca.csr_profile_id = cp.id
    AND ca.activity_date >= v_start_date
  WHERE cp.active = true
    AND (p_csr_profile_id IS NULL OR cp.id = p_csr_profile_id)
  GROUP BY cp.id, cp.display_name
  ORDER BY total_points DESC;
END;
$$;

-- Get CSR leaderboard
CREATE OR REPLACE FUNCTION public.get_csr_leaderboard(
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
  rank BIGINT,
  csr_profile_id UUID,
  csr_name TEXT,
  ytd_points INTEGER,
  mtd_points INTEGER,
  wtd_points INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH points_agg AS (
    SELECT
      cp.id,
      cp.display_name,
      COALESCE(SUM(ca.points) FILTER (
        WHERE ca.activity_date >= make_date(p_year, 1, 1)
      ), 0)::INTEGER AS ytd,
      COALESCE(SUM(ca.points) FILTER (
        WHERE ca.activity_date >= date_trunc('month', CURRENT_DATE)
      ), 0)::INTEGER AS mtd,
      COALESCE(SUM(ca.points) FILTER (
        WHERE ca.activity_date >= date_trunc('week', CURRENT_DATE)
      ), 0)::INTEGER AS wtd
    FROM public.csr_profiles cp
    LEFT JOIN public.csr_activities ca ON ca.csr_profile_id = cp.id
    WHERE cp.active = true
    GROUP BY cp.id, cp.display_name
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY ytd DESC) AS rank,
    id AS csr_profile_id,
    display_name AS csr_name,
    ytd AS ytd_points,
    mtd AS mtd_points,
    wtd AS wtd_points
  FROM points_agg
  ORDER BY ytd DESC;
END;
$$;
```

### 1.7 Seed CSR Profiles

```sql
-- Add CSR sources if not present
INSERT INTO public.sources (name, active, sort_order)
SELECT v.name, true, 110
FROM (VALUES ('Crystal'), ('Kathy'), ('Aleeah')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM public.sources WHERE LOWER(name) = LOWER(v.name));

-- Ensure CSR sources exist and get their IDs
INSERT INTO public.sources (name, active, sort_order)
VALUES ('Crystal', true, 110), ('Kathy', true, 111), ('Aleeah', true, 112)
ON CONFLICT DO NOTHING;

-- Seed CSR profiles with source_id FK for exact matching
INSERT INTO public.csr_profiles (user_id, source_id, display_name, email)
SELECT
  p.id,
  s.id,
  p.display_name,
  p.email
FROM public.profiles p
JOIN public.sources s ON (
  (p.email = 'crystal@coffeyagencies.com' AND s.name = 'Crystal') OR
  (p.email = 'kathy@coffeyagencies.com' AND s.name = 'Kathy') OR
  (p.email = 'aleeah@coffeyagencies.com' AND s.name = 'Aleeah')
)
WHERE p.email IN ('crystal@coffeyagencies.com', 'kathy@coffeyagencies.com', 'aleeah@coffeyagencies.com')
ON CONFLICT (user_id) DO UPDATE SET source_id = EXCLUDED.source_id;

-- Grant csr role to Crystal (she already has manager)
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'csr'::app_role
FROM public.profiles p
WHERE p.email = 'crystal@coffeyagencies.com'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'csr'
);

-- Grant csr role to Kathy and Aleeah
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'csr'::app_role
FROM public.profiles p
WHERE p.email IN ('kathy@coffeyagencies.com', 'aleeah@coffeyagencies.com')
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'csr'
);

-- Backfill 2026 CSR activities from quoted_households
-- Only Jan 1, 2026 forward — no 2025 data
-- Uses exact FK match via csr_profiles.source_id
INSERT INTO public.csr_activities (
  csr_profile_id, activity_type, points, activity_date,
  quoted_household_id, source, created_at
)
SELECT
  cp.id AS csr_profile_id,
  CASE
    WHEN qh.quick_action_status = 'SOLD' THEN 'referral_closed'
    WHEN qh.quick_action_status = 'Quoted' THEN 'referral_quoted'
  END AS activity_type,
  CASE
    WHEN qh.quick_action_status = 'SOLD' THEN 15
    WHEN qh.quick_action_status = 'Quoted' THEN 5
  END AS points,
  COALESCE(qh.quoted_at::DATE, qh.created_at::DATE),
  qh.id,
  'auto',
  NOW()
FROM public.quoted_households qh
JOIN public.csr_profiles cp ON cp.source_id = qh.lead_source_id  -- Exact FK match
WHERE qh.quick_action_status IN ('Quoted', 'SOLD')
  AND COALESCE(qh.quoted_at, qh.created_at) >= '2026-01-01'
ON CONFLICT (quoted_household_id, activity_type) DO NOTHING;
```

---

## Phase 2: Auth/Role Changes

### 2.1 TypeScript Role Updates

**File: `src/lib/roles.ts`** (line 3-8)

```typescript
export type RoleName =
  | 'owner'
  | 'manager'
  | 'producer'
  | 'reviewer'
  | 'sales_service'
  | 'csr'  // ADD THIS
```

### 2.2 Auth Redirect

**File: `src/lib/auth.ts`**

```typescript
// Add to UserRole type (line 5)
export type UserRole = 'owner' | 'manager' | 'producer' | 'reviewer' | 'sales_service' | 'csr'

// Add helper function (after line 51)
export const isCSR = (profile: Profile | null): boolean => {
  return profile?.role === 'csr'
}

// Update getRedirectPath (line 53-65)
export const getRedirectPath = (profile: Profile | null): string => {
  if (!profile) return '/login'

  if (isOwnerManager(profile)) {
    return '/team'
  } else if (isReviewer(profile)) {
    return '/producer'
  } else if (profile.role === 'sales_service') {
    return '/sales-service'
  } else if (profile.role === 'csr') {
    return '/csr'  // ADD THIS
  } else {
    return '/producer'
  }
}
```

---

## Phase 3: Sprint 1 - Core Dashboard

### 3.1 New Page

**File: `src/pages/CSRDashboardPage.tsx`**

```tsx
import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PointsSummaryCard } from '@/components/csr/PointsSummaryCard'
import { CSRLeaderboard } from '@/components/csr/CSRLeaderboard'
import { GoalProgressBar } from '@/components/csr/GoalProgressBar'
import { PeriodSelector } from '@/components/csr/PeriodSelector'

export default function CSRDashboardPage() {
  const { profile } = useAuth()
  const [period, setPeriod] = useState<'week' | 'month' | 'ytd'>('ytd')

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CSR Dashboard</h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Points */}
        <div className="lg:col-span-2 space-y-6">
          <PointsSummaryCard period={period} />
          {/* ActivityHistoryTable - Sprint 2 */}
        </div>

        {/* Right Column - Leaderboard & Progress */}
        <div className="space-y-6">
          <GoalProgressBar period={period} />
          <CSRLeaderboard />
          {/* BadgeDisplay - Sprint 3 */}
        </div>
      </div>
    </div>
  )
}
```

### 3.2 New Components

**Create directory: `src/components/csr/`**

| Component | Purpose |
|-----------|---------|
| `PointsSummaryCard.tsx` | Large total, breakdown by activity type |
| `CSRLeaderboard.tsx` | 3-person ranked table |
| `GoalProgressBar.tsx` | Progress toward weekly/monthly/yearly goal |
| `PeriodSelector.tsx` | Week/Month/YTD toggle tabs |

### 3.3 New Hooks

**File: `src/hooks/useCSRPoints.ts`**

```tsx
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useCSRPoints(period: 'week' | 'month' | 'ytd', csrProfileId?: string) {
  return useQuery({
    queryKey: ['csr-points', period, csrProfileId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_csr_points_summary', {
        p_period: period,
        p_csr_profile_id: csrProfileId || null
      })
      if (error) throw error
      return data
    }
  })
}
```

**File: `src/hooks/useCSRLeaderboard.ts`**

```tsx
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useCSRLeaderboard(year?: number) {
  return useQuery({
    queryKey: ['csr-leaderboard', year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_csr_leaderboard', {
        p_year: year || new Date().getFullYear()
      })
      if (error) throw error
      return data
    }
  })
}
```

### 3.4 Route Registration

**File: `src/App.tsx`** (add after line ~75)

```tsx
import CSRDashboardPage from './pages/CSRDashboardPage'

// Add route
<Route
  path="/csr"
  element={
    <ProtectedRoute requiresRoles={['csr', 'owner', 'manager']}>
      <AppLayout>
        <CSRDashboardPage />
      </AppLayout>
    </ProtectedRoute>
  }
/>
```

### 3.5 Navigation Update

**File: `src/components/AppSidebar.tsx`** (add to navigationItems array ~line 33)

```tsx
import { Award } from 'lucide-react'

// Add to navigationItems array
{
  href: '/csr',
  label: 'CSR Dashboard',
  icon: Award,
  allowedRoles: ['csr', 'owner', 'manager']
}
```

---

## Phase 4: Sprint 2 - Activity Logging

### 4.1 New Components

**File: `src/components/csr/ActivityLogForm.tsx`**
- Dropdown: Activity Type (google_review, retention_save, new_customer_referral)
- Input: Customer Name (optional)
- Date picker (default today)
- Textarea: Notes (optional)
- Submit button with loading state

**File: `src/components/csr/ActivityHistoryTable.tsx`**
- Paginated table of past activities
- Columns: Date, Type, Customer, Points, Source
- Filter by activity type

### 4.2 New Hook

**File: `src/hooks/useCSRActivities.ts`**

```tsx
export function useCSRActivities() {
  // createActivity mutation
  // getActivities query with pagination
  // deleteActivity mutation (manager only)
}
```

### 4.3 Auto-Tracking

**Option A: Database Trigger (Real-time)**

```sql
CREATE OR REPLACE FUNCTION public.trigger_csr_activity_from_qhh()
RETURNS TRIGGER AS $$
DECLARE
  v_csr_profile_id UUID;
  v_points INTEGER;
  v_activity_type TEXT;
BEGIN
  -- Check if lead_source is a CSR via exact FK match
  SELECT cp.id INTO v_csr_profile_id
  FROM public.csr_profiles cp
  WHERE cp.source_id = NEW.lead_source_id;

  -- Not a CSR source, skip
  IF v_csr_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine activity type and points
  IF NEW.quick_action_status = 'SOLD' THEN
    v_activity_type := 'referral_closed';
    v_points := 15;
  ELSIF NEW.quick_action_status = 'Quoted' THEN
    v_activity_type := 'referral_quoted';
    v_points := 5;
  ELSE
    RETURN NEW;
  END IF;

  -- Upsert activity (idempotent via unique constraint)
  INSERT INTO public.csr_activities (
    csr_profile_id, activity_type, points, activity_date,
    quoted_household_id, source
  )
  VALUES (
    v_csr_profile_id, v_activity_type, v_points,
    COALESCE(NEW.quoted_at::DATE, CURRENT_DATE),
    NEW.id, 'auto'
  )
  ON CONFLICT (quoted_household_id, activity_type) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER qhh_csr_activity_trigger
AFTER INSERT OR UPDATE OF quick_action_status ON public.quoted_households
FOR EACH ROW
EXECUTE FUNCTION public.trigger_csr_activity_from_qhh();
```

**Option B: Sync Function (Simpler, batch)**

```sql
CREATE OR REPLACE FUNCTION public.sync_csr_activities_from_qhh()
RETURNS INTEGER AS $$
-- Scans quoted_households for CSR lead sources
-- Creates csr_activities entries for quoted/sold records not yet tracked
-- Returns count of new activities created
$$ LANGUAGE plpgsql;
```

**Recommendation:** Start with Option B in Sprint 2, add Option A later if real-time is needed.

---

## Phase 5: Sprint 3 - Gamification

### 5.1 Badge System

| Badge | Trigger | Icon |
|-------|---------|------|
| first_blood | First point of year | Award |
| hat_trick | 3 referrals in 1 week | Trophy |
| super_saver | 5 retention saves (cumulative) | Shield |
| review_master | 10 Google reviews (cumulative) | Star |
| consistency | 4 consecutive weeks with activity | Flame |

### 5.2 Components

- `BadgeDisplay.tsx` - Grid of earned badges
- `BadgeModal.tsx` - Badge details on click
- `StreakCounter.tsx` - Weekly streak with fire emojis
- `CelebrationOverlay.tsx` - Confetti on milestones

### 5.3 Badge Award Logic

**File: `supabase/functions/award-csr-badges/index.ts`**

Edge function that:
1. Checks each CSR against badge criteria
2. Awards new badges
3. Returns list of newly awarded badges (for notification)

---

## Critical Files Summary

| Sprint | File | Action |
|--------|------|--------|
| 1 | `supabase/migrations/..._csr_dashboard.sql` | CREATE |
| 1 | `src/lib/roles.ts` | MODIFY |
| 1 | `src/lib/auth.ts` | MODIFY |
| 1 | `src/App.tsx` | MODIFY |
| 1 | `src/components/AppSidebar.tsx` | MODIFY |
| 1 | `src/pages/CSRDashboardPage.tsx` | CREATE |
| 1 | `src/components/csr/PointsSummaryCard.tsx` | CREATE |
| 1 | `src/components/csr/CSRLeaderboard.tsx` | CREATE |
| 1 | `src/components/csr/GoalProgressBar.tsx` | CREATE |
| 1 | `src/components/csr/PeriodSelector.tsx` | CREATE |
| 1 | `src/hooks/useCSRPoints.ts` | CREATE |
| 1 | `src/hooks/useCSRLeaderboard.ts` | CREATE |
| 2 | `src/components/csr/ActivityLogForm.tsx` | CREATE |
| 2 | `src/components/csr/ActivityHistoryTable.tsx` | CREATE |
| 2 | `src/hooks/useCSRActivities.ts` | CREATE |
| 3 | `src/components/csr/BadgeDisplay.tsx` | CREATE |
| 3 | `src/components/csr/StreakCounter.tsx` | CREATE |
| 3 | `src/components/csr/CelebrationOverlay.tsx` | CREATE |

---

## Verification Plan

### Sprint 1 Testing
1. Run migration - verify tables created in Supabase
2. Verify CSR profiles seeded for Crystal, Kathy, Aleeah
3. Log in as CSR - verify redirect to `/csr`
4. Verify leaderboard shows all 3 CSRs with 0 points
5. Verify Crystal can access both `/team` and `/csr`

### Sprint 2 Testing
1. Submit manual activity - verify points update
2. Create QHH with CSR lead source
3. Run sync function - verify auto-activity created
4. Change QHH to SOLD - verify +15 pts

### Sprint 3 Testing
1. Create enough activities to trigger badge
2. Verify badge appears on dashboard
3. Verify streak counter

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Gaming metrics (fake reviews) | Require customer name; add manager review option |
| Overjustification effect | Keep bonuses modest; emphasize meaning |
| Trailing CSR gives up | Show personal progress; encouragement messaging |
| Crystal dual-role confusion | Clear role switching; separate nav items |

---

## User Decisions (Confirmed)

1. **Goal targets**: 10 weekly / 40 monthly / 480 yearly points
2. **Historical backfill**: Yes, but 2026 data only (January 1, 2026 forward) — no 2025
3. **Crystal's view**: Separate "CSR Dashboard" nav item alongside manager pages
4. **Mobile priority**: TBD
5. **Bonus tier display**: TBD

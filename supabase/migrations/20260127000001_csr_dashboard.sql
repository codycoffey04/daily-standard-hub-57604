-- CSR Dashboard Migration
-- Sprint 1: Core tables, RLS, RPCs, seed data, and 2026 backfill

-- ============================================================================
-- 1. Add 'csr' to app_role enum
-- ============================================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'csr';

-- ============================================================================
-- 2. Create csr_profiles table
-- ============================================================================
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

-- ============================================================================
-- 3. Create csr_activities table
-- ============================================================================
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
  created_by UUID REFERENCES auth.users(id),

  -- Unique constraint for idempotent upserts (prevents duplicate auto-tracking)
  CONSTRAINT csr_activities_qhh_type UNIQUE (quoted_household_id, activity_type)
);

-- Performance indexes
CREATE INDEX idx_csr_activities_profile ON public.csr_activities(csr_profile_id);
CREATE INDEX idx_csr_activities_date ON public.csr_activities(activity_date);
CREATE INDEX idx_csr_activities_type ON public.csr_activities(activity_type);
CREATE INDEX idx_csr_activities_qhh ON public.csr_activities(quoted_household_id)
  WHERE quoted_household_id IS NOT NULL;

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

-- csr_profiles RLS
ALTER TABLE public.csr_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view CSR profiles"
ON public.csr_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owner/Manager can manage CSR profiles"
ON public.csr_profiles FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role IN ('owner', 'manager')
  )
);

-- csr_activities RLS
ALTER TABLE public.csr_activities ENABLE ROW LEVEL SECURITY;

-- CSRs, managers, and owners can view all activities
CREATE POLICY "Role-based view of CSR activities"
ON public.csr_activities FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role IN ('csr', 'owner', 'manager')
  )
);

-- CSRs can insert their own activities
CREATE POLICY "CSRs can insert own activities"
ON public.csr_activities FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.csr_profiles cp
    WHERE cp.id = csr_profile_id AND cp.user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role IN ('owner', 'manager')
  )
);

-- Only owner/manager can update
CREATE POLICY "Owner/Manager can update activities"
ON public.csr_activities FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role IN ('owner', 'manager')
  )
);

-- Only owner/manager can delete
CREATE POLICY "Owner/Manager can delete activities"
ON public.csr_activities FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (SELECT auth.uid()) AND ur.role IN ('owner', 'manager')
  )
);

-- ============================================================================
-- 5. Ensure CSR sources exist
-- ============================================================================
INSERT INTO public.sources (name, active, sort_order)
VALUES
  ('Crystal', true, 110),
  ('Kathy', true, 111),
  ('Aleeah', true, 112)
ON CONFLICT (name) DO UPDATE SET active = true;

-- ============================================================================
-- 6. CSR Points Configuration (in coaching_framework_config)
-- ============================================================================
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
)
ON CONFLICT (config_type) WHERE active = true
DO UPDATE SET config_data = EXCLUDED.config_data, version = coaching_framework_config.version + 1;

-- ============================================================================
-- 7. RPC: get_csr_points_summary
-- ============================================================================
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
    COALESCE(SUM(CASE WHEN ca.activity_type = 'referral_closed' THEN ca.points END), 0)::INTEGER AS referral_closed_pts,
    COALESCE(SUM(CASE WHEN ca.activity_type = 'referral_quoted' THEN ca.points END), 0)::INTEGER AS referral_quoted_pts,
    COALESCE(SUM(CASE WHEN ca.activity_type = 'google_review' THEN ca.points END), 0)::INTEGER AS google_review_pts,
    COALESCE(SUM(CASE WHEN ca.activity_type = 'retention_save' THEN ca.points END), 0)::INTEGER AS retention_save_pts,
    COALESCE(SUM(CASE WHEN ca.activity_type = 'new_customer_referral' THEN ca.points END), 0)::INTEGER AS new_customer_referral_pts,
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

-- ============================================================================
-- 8. RPC: get_csr_leaderboard
-- ============================================================================
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
    ROW_NUMBER() OVER (ORDER BY points_agg.ytd DESC) AS rank,
    points_agg.id AS csr_profile_id,
    points_agg.display_name AS csr_name,
    points_agg.ytd AS ytd_points,
    points_agg.mtd AS mtd_points,
    points_agg.wtd AS wtd_points
  FROM points_agg
  ORDER BY points_agg.ytd DESC;
END;
$$;

-- ============================================================================
-- 9. RPC: get_current_csr_profile (for logged-in CSR)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_csr_profile()
RETURNS TABLE (
  csr_profile_id UUID,
  display_name TEXT,
  email TEXT,
  source_id UUID
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id AS csr_profile_id,
    cp.display_name,
    cp.email,
    cp.source_id
  FROM public.csr_profiles cp
  WHERE cp.user_id = auth.uid()
    AND cp.active = true
  LIMIT 1;
END;
$$;

-- Simplify CSR Tracking: Remove auto-tracking, all activities now manual
-- This migration removes the auto-tracking infrastructure and makes all 7 activity types manual

-- ============================================================================
-- 1. Delete all auto-tracked entries (will re-enter Crystal's points manually)
-- ============================================================================
DELETE FROM public.csr_activities WHERE source = 'auto';

-- ============================================================================
-- 2. Drop the QHH trigger if it exists
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_csr_activity_from_qhh ON public.quoted_households;
DROP FUNCTION IF EXISTS public.create_csr_activity_from_qhh();

-- ============================================================================
-- 3. Remove source_id from csr_profiles (no longer needed for auto-tracking)
-- ============================================================================
-- First drop the unique constraint and index
ALTER TABLE public.csr_profiles DROP CONSTRAINT IF EXISTS csr_profiles_source_id_key;
DROP INDEX IF EXISTS idx_csr_profiles_source_id;

-- Then drop the column
ALTER TABLE public.csr_profiles DROP COLUMN IF EXISTS source_id;

-- ============================================================================
-- 4. Remove auto-tracking columns from csr_activities
-- ============================================================================
-- Drop the unique constraint on quoted_household_id (was for idempotent auto-tracking)
ALTER TABLE public.csr_activities DROP CONSTRAINT IF EXISTS csr_activities_qhh_type;

-- Drop the index and column
DROP INDEX IF EXISTS idx_csr_activities_qhh;
ALTER TABLE public.csr_activities DROP COLUMN IF EXISTS quoted_household_id;

-- Drop the source column (everything is manual now)
ALTER TABLE public.csr_activities DROP COLUMN IF EXISTS source;

-- ============================================================================
-- 5. Update activity_type constraint to include all 7 types (including winback)
-- ============================================================================
ALTER TABLE public.csr_activities DROP CONSTRAINT IF EXISTS csr_activities_activity_type_check;
ALTER TABLE public.csr_activities ADD CONSTRAINT csr_activities_activity_type_check
  CHECK (activity_type IN (
    'referral_closed',        -- 15 pts
    'referral_quoted',        -- 5 pts
    'google_review',          -- 10 pts
    'retention_save',         -- 10 pts
    'new_customer_referral',  -- 10 pts
    'winback_closed',         -- 10 pts
    'winback_quoted'          -- 3 pts
  ));

-- ============================================================================
-- 6. Update get_csr_points_summary RPC to include winback types
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
  winback_closed_pts INTEGER,
  winback_quoted_pts INTEGER,
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
    COALESCE(SUM(CASE WHEN ca.activity_type = 'winback_closed' THEN ca.points END), 0)::INTEGER AS winback_closed_pts,
    COALESCE(SUM(CASE WHEN ca.activity_type = 'winback_quoted' THEN ca.points END), 0)::INTEGER AS winback_quoted_pts,
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
-- 7. Update get_current_csr_profile RPC (remove source_id from return)
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_current_csr_profile();
CREATE OR REPLACE FUNCTION public.get_current_csr_profile()
RETURNS TABLE (
  csr_profile_id UUID,
  display_name TEXT,
  email TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id AS csr_profile_id,
    cp.display_name,
    cp.email
  FROM public.csr_profiles cp
  WHERE cp.user_id = auth.uid()
    AND cp.active = true
  LIMIT 1;
END;
$$;

-- ============================================================================
-- 8. Update CSR Points Configuration to include winback types
-- ============================================================================
UPDATE public.coaching_framework_config
SET config_data = '{
  "points": {
    "referral_closed": 15,
    "referral_quoted": 5,
    "google_review": 10,
    "retention_save": 10,
    "new_customer_referral": 10,
    "winback_closed": 10,
    "winback_quoted": 3
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
version = version + 1
WHERE config_type = 'csr_points_config' AND active = true;

-- CSR Dashboard Seed and Backfill
-- Seeds CSR profiles and backfills 2026 activities from quoted_households

-- ============================================================================
-- 1. Seed CSR profiles with source_id FK
-- Note: This assumes profiles exist for CSRs. If not, they'll need to be created first.
-- ============================================================================

-- First, let's see what CSR sources we have
DO $$
DECLARE
  v_crystal_source_id UUID;
  v_kathy_source_id UUID;
  v_aleeah_source_id UUID;
BEGIN
  -- Get source IDs
  SELECT id INTO v_crystal_source_id FROM public.sources WHERE LOWER(name) = 'crystal' LIMIT 1;
  SELECT id INTO v_kathy_source_id FROM public.sources WHERE LOWER(name) = 'kathy' LIMIT 1;
  SELECT id INTO v_aleeah_source_id FROM public.sources WHERE LOWER(name) = 'aleeah' LIMIT 1;

  -- Insert CSR profiles
  -- Crystal Brozio
  INSERT INTO public.csr_profiles (user_id, source_id, display_name, email)
  SELECT p.id, v_crystal_source_id, COALESCE(p.display_name, 'Crystal Brozio'), p.email
  FROM public.profiles p
  WHERE LOWER(p.email) LIKE '%crystal%'
     OR LOWER(p.display_name) LIKE '%crystal%'
  ON CONFLICT (user_id) DO UPDATE SET
    source_id = EXCLUDED.source_id,
    display_name = EXCLUDED.display_name;

  -- Kathy
  INSERT INTO public.csr_profiles (user_id, source_id, display_name, email)
  SELECT p.id, v_kathy_source_id, COALESCE(p.display_name, 'Kathy'), p.email
  FROM public.profiles p
  WHERE LOWER(p.email) LIKE '%kathy%'
     OR LOWER(p.display_name) LIKE '%kathy%'
  ON CONFLICT (user_id) DO UPDATE SET
    source_id = EXCLUDED.source_id,
    display_name = EXCLUDED.display_name;

  -- Aleeah Stone
  INSERT INTO public.csr_profiles (user_id, source_id, display_name, email)
  SELECT p.id, v_aleeah_source_id, COALESCE(p.display_name, 'Aleeah Stone'), p.email
  FROM public.profiles p
  WHERE LOWER(p.email) LIKE '%aleeah%'
     OR LOWER(p.display_name) LIKE '%aleeah%'
  ON CONFLICT (user_id) DO UPDATE SET
    source_id = EXCLUDED.source_id,
    display_name = EXCLUDED.display_name;

  RAISE NOTICE 'CSR profiles seeded. Crystal source: %, Kathy source: %, Aleeah source: %',
    v_crystal_source_id, v_kathy_source_id, v_aleeah_source_id;
END $$;

-- ============================================================================
-- 2. Grant CSR role to CSR users
-- ============================================================================
INSERT INTO public.user_roles (user_id, role)
SELECT cp.user_id, 'csr'::app_role
FROM public.csr_profiles cp
WHERE cp.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = cp.user_id AND ur.role = 'csr'
  );

-- ============================================================================
-- 3. Backfill 2026 CSR activities from quoted_households
-- Only Jan 1, 2026 forward — no 2025 data
-- Uses exact FK match via csr_profiles.source_id
-- ============================================================================
INSERT INTO public.csr_activities (
  csr_profile_id,
  activity_type,
  points,
  activity_date,
  quoted_household_id,
  source,
  created_at
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
  COALESCE(qh.quoted_at::DATE, qh.created_at::DATE) AS activity_date,
  qh.id AS quoted_household_id,
  'auto' AS source,
  NOW() AS created_at
FROM public.quoted_households qh
JOIN public.csr_profiles cp ON cp.source_id = qh.lead_source_id  -- Exact FK match
WHERE qh.quick_action_status IN ('Quoted', 'SOLD')
  AND COALESCE(qh.quoted_at, qh.created_at) >= '2026-01-01'
ON CONFLICT (quoted_household_id, activity_type) DO NOTHING;

-- Report how many activities were backfilled
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.csr_activities WHERE source = 'auto';
  RAISE NOTICE 'Backfilled % CSR activities from 2026 quoted_households', v_count;
END $$;

-- Seed CSR activities from Excel tracking (1/27/26)
-- Crystal: 100 pts, Kathy: 15 pts, Aleeah: 0 pts

-- First, clear any existing activities to start fresh
DELETE FROM public.csr_activities;

DO $$
DECLARE
  v_crystal_id UUID;
  v_kathy_id UUID;
  v_total_crystal INTEGER;
  v_total_kathy INTEGER;
BEGIN
  -- Get CSR profile IDs
  SELECT id INTO v_crystal_id FROM public.csr_profiles WHERE LOWER(display_name) LIKE '%crystal%' LIMIT 1;
  SELECT id INTO v_kathy_id FROM public.csr_profiles WHERE LOWER(display_name) LIKE '%kathy%' LIMIT 1;

  IF v_crystal_id IS NULL THEN
    RAISE EXCEPTION 'Crystal CSR profile not found';
  END IF;

  IF v_kathy_id IS NULL THEN
    RAISE EXCEPTION 'Kathy CSR profile not found';
  END IF;

  -- CRYSTAL's activities (100 points total)
  INSERT INTO public.csr_activities (csr_profile_id, activity_type, points, activity_date, notes)
  VALUES
    -- 1/6/2026
    (v_crystal_id, 'referral_quoted', 5, '2026-01-06', 'Backfill from Excel 1/27/26'),
    (v_crystal_id, 'referral_closed', 15, '2026-01-06', 'Backfill from Excel 1/27/26'),
    -- 1/8/2026
    (v_crystal_id, 'retention_save', 10, '2026-01-08', 'Backfill from Excel 1/27/26'),
    -- 1/9/2026
    (v_crystal_id, 'winback_closed', 10, '2026-01-09', 'Backfill from Excel 1/27/26'),
    (v_crystal_id, 'winback_closed', 10, '2026-01-09', 'Backfill from Excel 1/27/26'),
    -- 1/13/2026
    (v_crystal_id, 'google_review', 10, '2026-01-13', 'Backfill from Excel 1/27/26'),
    -- 1/20/2026
    (v_crystal_id, 'google_review', 10, '2026-01-20', 'Backfill from Excel 1/27/26'),
    -- 1/23/2026
    (v_crystal_id, 'referral_quoted', 5, '2026-01-23', 'Backfill from Excel 1/27/26'),
    (v_crystal_id, 'referral_closed', 15, '2026-01-23', 'Backfill from Excel 1/27/26'),
    (v_crystal_id, 'winback_closed', 10, '2026-01-23', 'Backfill from Excel 1/27/26');

  -- KATHY's activities (15 points total)
  INSERT INTO public.csr_activities (csr_profile_id, activity_type, points, activity_date, notes)
  VALUES
    -- 1/9/2026
    (v_kathy_id, 'referral_closed', 15, '2026-01-09', 'Backfill from Excel 1/27/26');

  -- Verify totals
  SELECT COALESCE(SUM(points), 0) INTO v_total_crystal
  FROM public.csr_activities WHERE csr_profile_id = v_crystal_id;

  SELECT COALESCE(SUM(points), 0) INTO v_total_kathy
  FROM public.csr_activities WHERE csr_profile_id = v_kathy_id;

  -- Assert expected totals
  IF v_total_crystal != 100 THEN
    RAISE EXCEPTION 'Crystal total mismatch: expected 100, got %', v_total_crystal;
  END IF;

  IF v_total_kathy != 15 THEN
    RAISE EXCEPTION 'Kathy total mismatch: expected 15, got %', v_total_kathy;
  END IF;

  RAISE NOTICE 'CSR activities seeded successfully:';
  RAISE NOTICE '  Crystal: % points', v_total_crystal;
  RAISE NOTICE '  Kathy: % points', v_total_kathy;
  RAISE NOTICE '  Aleeah: 0 points (no entries)';
END $$;

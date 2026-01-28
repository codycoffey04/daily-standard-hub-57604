-- =============================================
-- CSR Coaching: Dual-Mode Schema Extension
-- Adds coaching_type + csr_profile_id to coaching tables
-- Adds CSR-specific score columns to coaching_scores
-- =============================================

-- ============================================================================
-- 1. Add coaching_type to all coaching tables
-- ============================================================================

-- coaching_transcripts
ALTER TABLE public.coaching_transcripts
  ADD COLUMN coaching_type TEXT NOT NULL DEFAULT 'sales'
    CHECK (coaching_type IN ('sales', 'service'));

-- coaching_episodes
ALTER TABLE public.coaching_episodes
  ADD COLUMN coaching_type TEXT NOT NULL DEFAULT 'sales'
    CHECK (coaching_type IN ('sales', 'service'));

-- coaching_metrics
ALTER TABLE public.coaching_metrics
  ADD COLUMN coaching_type TEXT NOT NULL DEFAULT 'sales'
    CHECK (coaching_type IN ('sales', 'service'));

-- coaching_scores
ALTER TABLE public.coaching_scores
  ADD COLUMN coaching_type TEXT NOT NULL DEFAULT 'sales'
    CHECK (coaching_type IN ('sales', 'service'));

-- ============================================================================
-- 2. Add csr_profile_id (parallel to producer_id)
-- ============================================================================

ALTER TABLE public.coaching_transcripts
  ADD COLUMN csr_profile_id UUID REFERENCES public.csr_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coaching_episodes
  ADD COLUMN csr_profile_id UUID REFERENCES public.csr_profiles(id) ON DELETE CASCADE;

ALTER TABLE public.coaching_scores
  ADD COLUMN csr_profile_id UUID REFERENCES public.csr_profiles(id) ON DELETE CASCADE;

-- Make producer_id nullable (one of producer_id / csr_profile_id is set based on coaching_type)
ALTER TABLE public.coaching_transcripts ALTER COLUMN producer_id DROP NOT NULL;
ALTER TABLE public.coaching_episodes ALTER COLUMN producer_id DROP NOT NULL;

-- ============================================================================
-- 3. Add CSR-specific score columns to coaching_scores
-- ============================================================================

-- 7-step CSR scorecard (0-2 scale, all nullable)
ALTER TABLE public.coaching_scores ADD COLUMN step_1_greeting INTEGER CHECK (step_1_greeting BETWEEN 0 AND 2);
ALTER TABLE public.coaching_scores ADD COLUMN step_2_listening_empathy INTEGER CHECK (step_2_listening_empathy BETWEEN 0 AND 2);
ALTER TABLE public.coaching_scores ADD COLUMN step_3_problem_id INTEGER CHECK (step_3_problem_id BETWEEN 0 AND 2);
ALTER TABLE public.coaching_scores ADD COLUMN step_4_resolution INTEGER CHECK (step_4_resolution BETWEEN 0 AND 2);
ALTER TABLE public.coaching_scores ADD COLUMN step_5_cross_sell INTEGER CHECK (step_5_cross_sell BETWEEN 0 AND 2);
ALTER TABLE public.coaching_scores ADD COLUMN step_6_referral_ask_csr INTEGER CHECK (step_6_referral_ask_csr BETWEEN 0 AND 2);
ALTER TABLE public.coaching_scores ADD COLUMN step_7_retention INTEGER CHECK (step_7_retention BETWEEN 0 AND 2);

-- CSR-specific tracking fields
ALTER TABLE public.coaching_scores ADD COLUMN google_review_ask BOOLEAN;
ALTER TABLE public.coaching_scores ADD COLUMN life_insurance_opportunity BOOLEAN;
ALTER TABLE public.coaching_scores ADD COLUMN life_insurance_context TEXT;
ALTER TABLE public.coaching_scores ADD COLUMN call_type TEXT CHECK (call_type IN ('service', 'claims', 'billing', 'endorsement'));

-- ============================================================================
-- 4. Fix unique constraints for dual-mode
-- ============================================================================

-- coaching_episodes: drop old unique on (producer_id, week_start)
-- Replace with separate constraints per mode
ALTER TABLE public.coaching_episodes DROP CONSTRAINT IF EXISTS coaching_episodes_producer_id_week_start_key;

-- Sales: unique per producer per week
CREATE UNIQUE INDEX idx_coaching_episodes_sales_unique
  ON public.coaching_episodes(producer_id, week_start)
  WHERE coaching_type = 'sales' AND producer_id IS NOT NULL;

-- Service: unique per CSR per week
CREATE UNIQUE INDEX idx_coaching_episodes_service_unique
  ON public.coaching_episodes(csr_profile_id, week_start)
  WHERE coaching_type = 'service' AND csr_profile_id IS NOT NULL;

-- coaching_metrics: drop old unique on (week_start), add coaching_type
ALTER TABLE public.coaching_metrics DROP CONSTRAINT IF EXISTS coaching_metrics_week_start_key;
ALTER TABLE public.coaching_metrics ADD CONSTRAINT coaching_metrics_week_start_type_key
  UNIQUE(week_start, coaching_type);

-- coaching_episodes: allow focus_week_number up to 8 (sales) or 6 (service)
-- Current constraint is CHECK (focus_week_number BETWEEN 1 AND 8) which works for both

-- ============================================================================
-- 5. Add indexes for dual-mode queries
-- ============================================================================

CREATE INDEX idx_coaching_transcripts_type_week
  ON public.coaching_transcripts(coaching_type, week_start);

CREATE INDEX idx_coaching_transcripts_csr_week
  ON public.coaching_transcripts(csr_profile_id, week_start)
  WHERE csr_profile_id IS NOT NULL;

CREATE INDEX idx_coaching_episodes_csr
  ON public.coaching_episodes(csr_profile_id)
  WHERE csr_profile_id IS NOT NULL;

CREATE INDEX idx_coaching_episodes_type_week
  ON public.coaching_episodes(coaching_type, week_start DESC);

CREATE INDEX idx_coaching_scores_type
  ON public.coaching_scores(coaching_type);

-- ============================================================================
-- 6. Add CHECK constraints for data integrity
-- ============================================================================

-- Ensure exactly one of producer_id / csr_profile_id is set based on coaching_type
ALTER TABLE public.coaching_transcripts ADD CONSTRAINT coaching_transcripts_member_check
  CHECK (
    (coaching_type = 'sales' AND producer_id IS NOT NULL AND csr_profile_id IS NULL)
    OR
    (coaching_type = 'service' AND csr_profile_id IS NOT NULL AND producer_id IS NULL)
  );

ALTER TABLE public.coaching_episodes ADD CONSTRAINT coaching_episodes_member_check
  CHECK (
    (coaching_type = 'sales' AND producer_id IS NOT NULL AND csr_profile_id IS NULL)
    OR
    (coaching_type = 'service' AND csr_profile_id IS NOT NULL)
  );

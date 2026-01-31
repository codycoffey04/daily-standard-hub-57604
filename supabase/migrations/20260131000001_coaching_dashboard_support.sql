-- Migration: Coaching Dashboard Card Support
-- Date: 2026-01-31
-- Purpose: Add focus_challenge column, RPC function for dashboard card, and indexes

-- 1. Add focus_challenge column to coaching_episodes
ALTER TABLE public.coaching_episodes
ADD COLUMN IF NOT EXISTS focus_challenge TEXT;

COMMENT ON COLUMN public.coaching_episodes.focus_challenge IS 'Weekly challenge text from focus rotation, populated at episode generation time';

-- 2. Performance indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_coaching_episodes_producer_week_published
ON public.coaching_episodes(producer_id, week_start DESC)
WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_coaching_episodes_csr_week_published
ON public.coaching_episodes(csr_profile_id, week_start DESC)
WHERE status = 'published';

-- 3. RPC Function: get_coaching_score_comparison
-- Returns current week scores + previous week scores + deltas for dashboard card
CREATE OR REPLACE FUNCTION public.get_coaching_score_comparison(
  p_member_id UUID,
  p_coaching_type TEXT,
  p_is_csr BOOLEAN DEFAULT FALSE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_episode RECORD;
  v_previous_episode RECORD;
  v_current_scores JSON;
  v_previous_scores JSON;
  v_current_week_start DATE;
  v_result JSON;
BEGIN
  -- Calculate current week start (Monday)
  v_current_week_start := date_trunc('week', CURRENT_DATE)::DATE;

  -- Find most recent published episode for this member in current week
  IF p_is_csr THEN
    SELECT * INTO v_current_episode
    FROM public.coaching_episodes
    WHERE csr_profile_id = p_member_id
      AND coaching_type = p_coaching_type
      AND status = 'published'
      AND week_start = v_current_week_start
    ORDER BY published_at DESC
    LIMIT 1;
  ELSE
    SELECT * INTO v_current_episode
    FROM public.coaching_episodes
    WHERE producer_id = p_member_id
      AND coaching_type = p_coaching_type
      AND status = 'published'
      AND week_start = v_current_week_start
    ORDER BY published_at DESC
    LIMIT 1;
  END IF;

  -- If no current week episode, return null
  IF v_current_episode.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Find previous week's episode
  IF p_is_csr THEN
    SELECT * INTO v_previous_episode
    FROM public.coaching_episodes
    WHERE csr_profile_id = p_member_id
      AND coaching_type = p_coaching_type
      AND status = 'published'
      AND week_start = v_current_week_start - INTERVAL '7 days'
    ORDER BY published_at DESC
    LIMIT 1;
  ELSE
    SELECT * INTO v_previous_episode
    FROM public.coaching_episodes
    WHERE producer_id = p_member_id
      AND coaching_type = p_coaching_type
      AND status = 'published'
      AND week_start = v_current_week_start - INTERVAL '7 days'
    ORDER BY published_at DESC
    LIMIT 1;
  END IF;

  -- Get current week scores
  IF p_coaching_type = 'sales' THEN
    SELECT json_build_object(
      'week_start', v_current_episode.week_start,
      'focus_theme', v_current_episode.focus_theme,
      'focus_challenge', v_current_episode.focus_challenge,
      'transcript_count', COUNT(cs.id),
      'overall_avg', ROUND(AVG(
        COALESCE(cs.step_1_opening, 0) +
        COALESCE(cs.step_2_discovery, 0) +
        COALESCE(cs.step_3_quoting, 0) +
        COALESCE(cs.step_4_ask_for_sale, 0) +
        COALESCE(cs.step_5_closing, 0) +
        COALESCE(cs.step_6_follow_up, 0) +
        COALESCE(cs.step_7_multi_line, 0) +
        COALESCE(cs.step_8_referral_ask, 0)
      )::NUMERIC / 8, 2),
      'step_averages', json_build_object(
        'step_1_opening', ROUND(AVG(COALESCE(cs.step_1_opening, 0))::NUMERIC, 2),
        'step_2_discovery', ROUND(AVG(COALESCE(cs.step_2_discovery, 0))::NUMERIC, 2),
        'step_3_quoting', ROUND(AVG(COALESCE(cs.step_3_quoting, 0))::NUMERIC, 2),
        'step_4_ask_for_sale', ROUND(AVG(COALESCE(cs.step_4_ask_for_sale, 0))::NUMERIC, 2),
        'step_5_closing', ROUND(AVG(COALESCE(cs.step_5_closing, 0))::NUMERIC, 2),
        'step_6_follow_up', ROUND(AVG(COALESCE(cs.step_6_follow_up, 0))::NUMERIC, 2),
        'step_7_multi_line', ROUND(AVG(COALESCE(cs.step_7_multi_line, 0))::NUMERIC, 2),
        'step_8_referral_ask', ROUND(AVG(COALESCE(cs.step_8_referral_ask, 0))::NUMERIC, 2)
      )
    ) INTO v_current_scores
    FROM public.coaching_scores cs
    WHERE cs.episode_id = v_current_episode.id;
  ELSE
    -- Service coaching (7 steps + google_review_ask KPI)
    SELECT json_build_object(
      'week_start', v_current_episode.week_start,
      'focus_theme', v_current_episode.focus_theme,
      'focus_challenge', v_current_episode.focus_challenge,
      'transcript_count', COUNT(cs.id),
      'overall_avg', ROUND(AVG(
        COALESCE(cs.step_1_greeting, 0) +
        COALESCE(cs.step_2_listening_empathy, 0) +
        COALESCE(cs.step_3_problem_id, 0) +
        COALESCE(cs.step_4_resolution, 0) +
        COALESCE(cs.step_5_cross_sell, 0) +
        COALESCE(cs.step_6_referral_ask_csr, 0) +
        COALESCE(cs.step_7_retention, 0)
      )::NUMERIC / 7, 2),
      'step_averages', json_build_object(
        'step_1_greeting', ROUND(AVG(COALESCE(cs.step_1_greeting, 0))::NUMERIC, 2),
        'step_2_listening_empathy', ROUND(AVG(COALESCE(cs.step_2_listening_empathy, 0))::NUMERIC, 2),
        'step_3_problem_id', ROUND(AVG(COALESCE(cs.step_3_problem_id, 0))::NUMERIC, 2),
        'step_4_resolution', ROUND(AVG(COALESCE(cs.step_4_resolution, 0))::NUMERIC, 2),
        'step_5_cross_sell', ROUND(AVG(COALESCE(cs.step_5_cross_sell, 0))::NUMERIC, 2),
        'step_6_referral_ask_csr', ROUND(AVG(COALESCE(cs.step_6_referral_ask_csr, 0))::NUMERIC, 2),
        'step_7_retention', ROUND(AVG(COALESCE(cs.step_7_retention, 0))::NUMERIC, 2)
      ),
      'google_review_ask_rate', ROUND(
        (COUNT(CASE WHEN cs.google_review_ask = true THEN 1 END)::NUMERIC /
         NULLIF(COUNT(cs.id), 0) * 100), 0
      )
    ) INTO v_current_scores
    FROM public.coaching_scores cs
    WHERE cs.episode_id = v_current_episode.id;
  END IF;

  -- Get previous week scores (if episode exists)
  IF v_previous_episode.id IS NOT NULL THEN
    IF p_coaching_type = 'sales' THEN
      SELECT json_build_object(
        'week_start', v_previous_episode.week_start,
        'focus_theme', v_previous_episode.focus_theme,
        'overall_avg', ROUND(AVG(
          COALESCE(cs.step_1_opening, 0) +
          COALESCE(cs.step_2_discovery, 0) +
          COALESCE(cs.step_3_quoting, 0) +
          COALESCE(cs.step_4_ask_for_sale, 0) +
          COALESCE(cs.step_5_closing, 0) +
          COALESCE(cs.step_6_follow_up, 0) +
          COALESCE(cs.step_7_multi_line, 0) +
          COALESCE(cs.step_8_referral_ask, 0)
        )::NUMERIC / 8, 2),
        'step_averages', json_build_object(
          'step_1_opening', ROUND(AVG(COALESCE(cs.step_1_opening, 0))::NUMERIC, 2),
          'step_2_discovery', ROUND(AVG(COALESCE(cs.step_2_discovery, 0))::NUMERIC, 2),
          'step_3_quoting', ROUND(AVG(COALESCE(cs.step_3_quoting, 0))::NUMERIC, 2),
          'step_4_ask_for_sale', ROUND(AVG(COALESCE(cs.step_4_ask_for_sale, 0))::NUMERIC, 2),
          'step_5_closing', ROUND(AVG(COALESCE(cs.step_5_closing, 0))::NUMERIC, 2),
          'step_6_follow_up', ROUND(AVG(COALESCE(cs.step_6_follow_up, 0))::NUMERIC, 2),
          'step_7_multi_line', ROUND(AVG(COALESCE(cs.step_7_multi_line, 0))::NUMERIC, 2),
          'step_8_referral_ask', ROUND(AVG(COALESCE(cs.step_8_referral_ask, 0))::NUMERIC, 2)
        )
      ) INTO v_previous_scores
      FROM public.coaching_scores cs
      WHERE cs.episode_id = v_previous_episode.id;
    ELSE
      SELECT json_build_object(
        'week_start', v_previous_episode.week_start,
        'focus_theme', v_previous_episode.focus_theme,
        'overall_avg', ROUND(AVG(
          COALESCE(cs.step_1_greeting, 0) +
          COALESCE(cs.step_2_listening_empathy, 0) +
          COALESCE(cs.step_3_problem_id, 0) +
          COALESCE(cs.step_4_resolution, 0) +
          COALESCE(cs.step_5_cross_sell, 0) +
          COALESCE(cs.step_6_referral_ask_csr, 0) +
          COALESCE(cs.step_7_retention, 0)
        )::NUMERIC / 7, 2),
        'step_averages', json_build_object(
          'step_1_greeting', ROUND(AVG(COALESCE(cs.step_1_greeting, 0))::NUMERIC, 2),
          'step_2_listening_empathy', ROUND(AVG(COALESCE(cs.step_2_listening_empathy, 0))::NUMERIC, 2),
          'step_3_problem_id', ROUND(AVG(COALESCE(cs.step_3_problem_id, 0))::NUMERIC, 2),
          'step_4_resolution', ROUND(AVG(COALESCE(cs.step_4_resolution, 0))::NUMERIC, 2),
          'step_5_cross_sell', ROUND(AVG(COALESCE(cs.step_5_cross_sell, 0))::NUMERIC, 2),
          'step_6_referral_ask_csr', ROUND(AVG(COALESCE(cs.step_6_referral_ask_csr, 0))::NUMERIC, 2),
          'step_7_retention', ROUND(AVG(COALESCE(cs.step_7_retention, 0))::NUMERIC, 2)
        ),
        'google_review_ask_rate', ROUND(
          (COUNT(CASE WHEN cs.google_review_ask = true THEN 1 END)::NUMERIC /
           NULLIF(COUNT(cs.id), 0) * 100), 0
        )
      ) INTO v_previous_scores
      FROM public.coaching_scores cs
      WHERE cs.episode_id = v_previous_episode.id;
    END IF;
  END IF;

  -- Build result with delta calculation
  v_result := json_build_object(
    'current_week', v_current_scores,
    'previous_week', v_previous_scores,
    'delta', CASE
      WHEN v_previous_scores IS NOT NULL THEN
        json_build_object(
          'overall', ROUND(
            (v_current_scores->>'overall_avg')::NUMERIC -
            (v_previous_scores->>'overall_avg')::NUMERIC, 2
          )
        )
      ELSE NULL
    END
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_coaching_score_comparison IS 'Returns coaching scores for current and previous week with deltas for dashboard card display';

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_coaching_score_comparison TO authenticated;

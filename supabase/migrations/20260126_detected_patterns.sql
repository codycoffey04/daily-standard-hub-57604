-- ==========================================
-- AI Pattern Detection System
-- Migration: detected_patterns table + RPCs
-- ==========================================

-- ==================
-- 1. DETECTED PATTERNS TABLE
-- ==================

CREATE TABLE IF NOT EXISTS public.detected_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES public.producers(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'low_conversion',     -- High QHH + 0 items
    'source_failing',     -- Same source 0 items 3+ days
    'outside_streak',     -- 3+ consecutive OUTSIDE days
    'zero_item_streak'    -- 3+ consecutive 0-item days
  )),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context JSONB NOT NULL DEFAULT '{}',
  resolved_at TIMESTAMPTZ,
  auto_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_detected_patterns_producer ON public.detected_patterns (producer_id);
CREATE INDEX IF NOT EXISTS idx_detected_patterns_active ON public.detected_patterns (detected_at)
  WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_detected_patterns_type ON public.detected_patterns (pattern_type);

-- ==================
-- 2. RLS POLICIES
-- ==================

ALTER TABLE public.detected_patterns ENABLE ROW LEVEL SECURITY;

-- Owners and managers can see all patterns
CREATE POLICY "Owners and managers can view all patterns"
  ON public.detected_patterns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner', 'manager')
    )
  );

-- Producers can only see their own patterns
-- Link: profiles.id (auth.uid()) -> profiles.producer_id -> producers.id
CREATE POLICY "Producers can view own patterns"
  ON public.detected_patterns
  FOR SELECT
  USING (
    producer_id IN (
      SELECT pr.producer_id FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.producer_id IS NOT NULL
    )
  );

-- Only system (service role) can insert/update/delete patterns
-- Edge functions run with service role, so no insert/update/delete policies needed for users

-- ==================
-- 3. GET ACTIVE PATTERNS FOR PRODUCER
-- ==================

CREATE OR REPLACE FUNCTION public.get_producer_patterns(p_producer_id UUID)
RETURNS TABLE (
  id UUID,
  pattern_type TEXT,
  severity TEXT,
  detected_at TIMESTAMPTZ,
  context JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    dp.id,
    dp.pattern_type,
    dp.severity,
    dp.detected_at,
    dp.context
  FROM public.detected_patterns dp
  WHERE dp.producer_id = p_producer_id
    AND dp.resolved_at IS NULL
  ORDER BY
    CASE dp.severity
      WHEN 'critical' THEN 1
      WHEN 'warning' THEN 2
      ELSE 3
    END,
    dp.detected_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_producer_patterns(UUID) TO authenticated;

-- ==================
-- 4. GET ALL ACTIVE PATTERNS (for managers)
-- ==================

CREATE OR REPLACE FUNCTION public.get_all_active_patterns()
RETURNS TABLE (
  id UUID,
  producer_id UUID,
  producer_name TEXT,
  pattern_type TEXT,
  severity TEXT,
  detected_at TIMESTAMPTZ,
  context JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    dp.id,
    dp.producer_id,
    p.display_name as producer_name,
    dp.pattern_type,
    dp.severity,
    dp.detected_at,
    dp.context
  FROM public.detected_patterns dp
  INNER JOIN public.producers p ON dp.producer_id = p.id
  WHERE dp.resolved_at IS NULL
  ORDER BY
    CASE dp.severity
      WHEN 'critical' THEN 1
      WHEN 'warning' THEN 2
      ELSE 3
    END,
    dp.detected_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_all_active_patterns() TO authenticated;

-- ==================
-- 5. GET SOURCE FAILURE STREAKS
-- Returns sources with 0 items for 3+ consecutive days per producer
-- ==================

CREATE OR REPLACE FUNCTION public.get_source_failure_streaks(p_lookback_days INTEGER DEFAULT 14)
RETURNS TABLE (
  producer_id UUID,
  producer_name TEXT,
  source_id UUID,
  source_name TEXT,
  streak_days INTEGER,
  last_item_date DATE,
  total_qhh INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT generate_series(
      (CURRENT_DATE - (p_lookback_days || ' days')::INTERVAL)::DATE,
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE as check_date
  ),
  producer_source_days AS (
    -- Get all producer+source+date combinations with their items
    SELECT
      p.id as producer_id,
      p.display_name as producer_name,
      s.id as source_id,
      s.name as source_name,
      dr.check_date,
      COALESCE(des.items, 0) as items,
      COALESCE(des.qhh, 0) as qhh
    FROM public.producers p
    CROSS JOIN public.sources s
    CROSS JOIN date_range dr
    LEFT JOIN public.daily_entries de ON de.producer_id = p.id
      AND de.entry_date = dr.check_date
    LEFT JOIN public.daily_entry_sources des ON des.entry_id = de.id
      AND des.source_id = s.id
    WHERE p.active = true
      AND s.is_active = true
      -- Only include dates where the producer had ANY entry
      AND EXISTS (
        SELECT 1 FROM public.daily_entries de2
        WHERE de2.producer_id = p.id
          AND de2.entry_date = dr.check_date
      )
  ),
  streaks AS (
    -- Calculate consecutive zero-item days per producer+source
    SELECT
      psd.producer_id,
      psd.producer_name,
      psd.source_id,
      psd.source_name,
      psd.check_date,
      psd.items,
      psd.qhh,
      -- Group consecutive zero-item days
      SUM(CASE WHEN psd.items > 0 THEN 1 ELSE 0 END)
        OVER (PARTITION BY psd.producer_id, psd.source_id ORDER BY psd.check_date) as item_group
    FROM producer_source_days psd
  ),
  current_streaks AS (
    -- Find the current streak (most recent consecutive zeros ending at today or yesterday)
    SELECT
      s.producer_id,
      s.producer_name,
      s.source_id,
      s.source_name,
      COUNT(*) as streak_days,
      MAX(CASE WHEN s.items > 0 THEN s.check_date END) as last_item_date,
      SUM(s.qhh) as total_qhh
    FROM streaks s
    WHERE s.items = 0
      AND s.item_group = (
        -- Get the latest item_group value for this producer+source
        SELECT MAX(s2.item_group)
        FROM streaks s2
        WHERE s2.producer_id = s.producer_id
          AND s2.source_id = s.source_id
      )
      -- Only consider streaks that include recent days (last 3 days)
      AND s.check_date >= CURRENT_DATE - INTERVAL '3 days'
    GROUP BY s.producer_id, s.producer_name, s.source_id, s.source_name
  )
  SELECT
    cs.producer_id,
    cs.producer_name,
    cs.source_id,
    cs.source_name,
    cs.streak_days::INTEGER,
    cs.last_item_date,
    cs.total_qhh::INTEGER
  FROM current_streaks cs
  WHERE cs.streak_days >= 3
  ORDER BY cs.streak_days DESC, cs.producer_name, cs.source_name;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_source_failure_streaks(INTEGER) TO authenticated;

-- ==================
-- 6. GET OUTSIDE STREAKS
-- Returns producers with 3+ consecutive OUTSIDE framework status days
-- ==================

CREATE OR REPLACE FUNCTION public.get_outside_streaks(p_lookback_days INTEGER DEFAULT 14)
RETURNS TABLE (
  producer_id UUID,
  producer_name TEXT,
  streak_days INTEGER,
  streak_start DATE,
  streak_end DATE,
  avg_metrics JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH producer_status AS (
    -- Get framework status for each producer+date
    SELECT
      es.producer_id,
      p.display_name as producer_name,
      es.entry_date,
      es.framework_status,
      CASE WHEN es.framework_status = 'Outside' THEN 0 ELSE 1 END as in_framework
    FROM public.entry_status es
    INNER JOIN public.producers p ON es.producer_id = p.id
    WHERE p.active = true
      AND es.entry_date >= CURRENT_DATE - (p_lookback_days || ' days')::INTERVAL
  ),
  streaks AS (
    -- Group consecutive OUTSIDE days
    SELECT
      ps.producer_id,
      ps.producer_name,
      ps.entry_date,
      ps.framework_status,
      ps.in_framework,
      SUM(ps.in_framework) OVER (
        PARTITION BY ps.producer_id
        ORDER BY ps.entry_date
      ) as break_group
    FROM producer_status ps
  ),
  outside_streaks AS (
    -- Calculate streak details for OUTSIDE periods
    SELECT
      s.producer_id,
      s.producer_name,
      s.break_group,
      COUNT(*) as streak_days,
      MIN(s.entry_date) as streak_start,
      MAX(s.entry_date) as streak_end
    FROM streaks s
    WHERE s.in_framework = 0
    GROUP BY s.producer_id, s.producer_name, s.break_group
    HAVING COUNT(*) >= 3
  ),
  streak_metrics AS (
    -- Calculate average metrics during streak period
    SELECT
      os.producer_id,
      os.producer_name,
      os.streak_days,
      os.streak_start,
      os.streak_end,
      json_build_object(
        'avg_dials', ROUND(AVG(de.dials)::NUMERIC, 1),
        'avg_talk_minutes', ROUND(AVG(de.talk_minutes)::NUMERIC, 1),
        'avg_qhh', ROUND(AVG(de.qhh_total)::NUMERIC, 1),
        'avg_items', ROUND(AVG(de.items_total)::NUMERIC, 1)
      ) as avg_metrics
    FROM outside_streaks os
    LEFT JOIN public.daily_entries de ON de.producer_id = os.producer_id
      AND de.entry_date >= os.streak_start
      AND de.entry_date <= os.streak_end
    GROUP BY os.producer_id, os.producer_name, os.streak_days, os.streak_start, os.streak_end
  )
  SELECT
    sm.producer_id,
    sm.producer_name,
    sm.streak_days::INTEGER,
    sm.streak_start,
    sm.streak_end,
    sm.avg_metrics
  FROM streak_metrics sm
  -- Only return current/recent streaks (ending within last 3 days)
  WHERE sm.streak_end >= CURRENT_DATE - INTERVAL '2 days'
  ORDER BY sm.streak_days DESC, sm.producer_name;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_outside_streaks(INTEGER) TO authenticated;

-- ==================
-- 7. GET ZERO ITEM STREAKS
-- Returns producers with 3+ consecutive 0-item days
-- ==================

CREATE OR REPLACE FUNCTION public.get_zero_item_streaks(p_lookback_days INTEGER DEFAULT 14)
RETURNS TABLE (
  producer_id UUID,
  producer_name TEXT,
  streak_days INTEGER,
  streak_start DATE,
  streak_end DATE,
  total_qhh_during_streak INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH producer_items AS (
    -- Get items for each producer+date
    SELECT
      de.producer_id,
      p.display_name as producer_name,
      de.entry_date,
      de.items_total,
      de.qhh_total,
      CASE WHEN de.items_total > 0 THEN 1 ELSE 0 END as has_items
    FROM public.daily_entries de
    INNER JOIN public.producers p ON de.producer_id = p.id
    WHERE p.active = true
      AND de.entry_date >= CURRENT_DATE - (p_lookback_days || ' days')::INTERVAL
  ),
  streaks AS (
    -- Group consecutive zero-item days
    SELECT
      pi.producer_id,
      pi.producer_name,
      pi.entry_date,
      pi.items_total,
      pi.qhh_total,
      pi.has_items,
      SUM(pi.has_items) OVER (
        PARTITION BY pi.producer_id
        ORDER BY pi.entry_date
      ) as break_group
    FROM producer_items pi
  ),
  zero_streaks AS (
    -- Calculate streak details for zero-item periods
    SELECT
      s.producer_id,
      s.producer_name,
      s.break_group,
      COUNT(*) as streak_days,
      MIN(s.entry_date) as streak_start,
      MAX(s.entry_date) as streak_end,
      SUM(s.qhh_total) as total_qhh
    FROM streaks s
    WHERE s.has_items = 0
    GROUP BY s.producer_id, s.producer_name, s.break_group
    HAVING COUNT(*) >= 3
  )
  SELECT
    zs.producer_id,
    zs.producer_name,
    zs.streak_days::INTEGER,
    zs.streak_start,
    zs.streak_end,
    COALESCE(zs.total_qhh, 0)::INTEGER as total_qhh_during_streak
  FROM zero_streaks zs
  -- Only return current/recent streaks (ending within last 3 days)
  WHERE zs.streak_end >= CURRENT_DATE - INTERVAL '2 days'
  ORDER BY zs.streak_days DESC, zs.producer_name;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_zero_item_streaks(INTEGER) TO authenticated;

-- ==================
-- 8. RESOLVE PATTERN (for manual resolution if needed)
-- ==================

CREATE OR REPLACE FUNCTION public.resolve_pattern(p_pattern_id UUID, p_auto BOOLEAN DEFAULT FALSE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.detected_patterns
  SET
    resolved_at = NOW(),
    auto_resolved = p_auto
  WHERE id = p_pattern_id
    AND resolved_at IS NULL;

  RETURN FOUND;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.resolve_pattern(UUID, BOOLEAN) TO authenticated;

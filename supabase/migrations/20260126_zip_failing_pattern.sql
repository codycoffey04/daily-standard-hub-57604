-- ==========================================
-- Zip Failing Pattern Detection
-- Migration: Add zip_failing pattern type + RPC
-- ==========================================

-- ==================
-- Step 1: Update pattern_type constraint to include zip_failing
-- ==================

ALTER TABLE public.detected_patterns
DROP CONSTRAINT IF EXISTS detected_patterns_pattern_type_check;

ALTER TABLE public.detected_patterns
ADD CONSTRAINT detected_patterns_pattern_type_check
CHECK (pattern_type IN (
  'low_conversion',
  'source_failing',
  'outside_streak',
  'zero_item_streak',
  'zip_failing'  -- NEW
));

-- ==================
-- Step 2: Add get_failing_zips_v2 RPC function
-- Returns ZIPs with 8+ quotes and 0 sales in rolling 30 days
-- ==================

CREATE OR REPLACE FUNCTION public.get_failing_zips_v2(p_lookback_days INTEGER DEFAULT 30)
RETURNS TABLE (
  producer_id UUID,
  producer_name TEXT,
  zip_code TEXT,
  quotes INTEGER,
  sales INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_end_date := CURRENT_DATE;
  v_start_date := CURRENT_DATE - (p_lookback_days || ' days')::INTERVAL;

  RETURN QUERY
  WITH qhh_by_zip AS (
    -- Get all QHH records grouped by producer and ZIP
    -- Join through daily_entries to get producer_id
    SELECT
      de.producer_id,
      p.display_name as producer_name,
      qh.zip_code::TEXT as zip_code,
      COUNT(*) as quote_count
    FROM public.quoted_households qh
    INNER JOIN public.daily_entries de ON qh.daily_entry_id = de.id
    INNER JOIN public.producers p ON de.producer_id = p.id
    WHERE de.entry_date >= v_start_date
      AND de.entry_date <= v_end_date
      AND p.active = true
      AND qh.zip_code IS NOT NULL
      AND qh.zip_code != ''
    GROUP BY de.producer_id, p.display_name, qh.zip_code
    HAVING COUNT(*) >= 8  -- Only ZIPs with 8+ quotes
  ),
  sales_by_zip AS (
    -- Count actual sales per ZIP using items_sold on quoted_households
    SELECT
      de.producer_id,
      qh.zip_code::TEXT as zip_code,
      SUM(COALESCE(qh.items_sold, 0)) as sale_count
    FROM public.quoted_households qh
    INNER JOIN public.daily_entries de ON qh.daily_entry_id = de.id
    WHERE de.entry_date >= v_start_date
      AND de.entry_date <= v_end_date
      AND qh.items_sold > 0
    GROUP BY de.producer_id, qh.zip_code
  )
  SELECT
    q.producer_id,
    q.producer_name,
    q.zip_code,
    q.quote_count::INTEGER as quotes,
    COALESCE(s.sale_count, 0)::INTEGER as sales
  FROM qhh_by_zip q
  LEFT JOIN sales_by_zip s ON q.producer_id = s.producer_id AND q.zip_code = s.zip_code
  WHERE COALESCE(s.sale_count, 0) = 0  -- Only ZIPs with 0 sales
  ORDER BY q.quote_count DESC, q.producer_name, q.zip_code;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_failing_zips_v2(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_failing_zips_v2(INTEGER) TO service_role;

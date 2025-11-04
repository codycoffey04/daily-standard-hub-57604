-- Producer Baseline and Current Comparison Functions
-- Idempotent: CREATE OR REPLACE allows safe re-runs

-- Function 1: Get producer baseline metrics
CREATE OR REPLACE FUNCTION get_producer_baseline(
  p_producer_id UUID,
  p_baseline_weeks INTEGER DEFAULT 4
)
RETURNS TABLE (
  avg_qhh NUMERIC,
  avg_quotes NUMERIC,
  avg_close_rate NUMERIC,
  avg_items NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH baseline_period AS (
    SELECT 
      COALESCE(SUM(de.qhh), 0) as total_qhh,
      COALESCE(SUM(de.quotes), 0) as total_quotes,
      COALESCE(SUM(de.items), 0) as total_items,
      COUNT(DISTINCT de.entry_date) as total_days
    FROM daily_entries de
    WHERE de.producer_id = p_producer_id
      AND de.entry_date >= CURRENT_DATE - (p_baseline_weeks * 7)
      AND de.entry_date < CURRENT_DATE - (p_baseline_weeks * 7 / 2)
  )
  SELECT 
    ROUND(bp.total_qhh::NUMERIC / NULLIF(bp.total_days, 0), 2) as avg_qhh,
    ROUND(bp.total_quotes::NUMERIC / NULLIF(bp.total_days, 0), 2) as avg_quotes,
    CASE 
      WHEN bp.total_qhh > 0 THEN 
        ROUND((bp.total_quotes::NUMERIC / bp.total_qhh) * 100, 2)
      ELSE 0
    END as avg_close_rate,
    ROUND(bp.total_items::NUMERIC / NULLIF(bp.total_days, 0), 2) as avg_items
  FROM baseline_period bp;
END;
$$;

-- Function 2: Get producer current period metrics
CREATE OR REPLACE FUNCTION get_producer_current(
  p_producer_id UUID,
  p_current_weeks INTEGER DEFAULT 2
)
RETURNS TABLE (
  avg_qhh NUMERIC,
  avg_quotes NUMERIC,
  avg_close_rate NUMERIC,
  avg_items NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT 
      COALESCE(SUM(de.qhh), 0) as total_qhh,
      COALESCE(SUM(de.quotes), 0) as total_quotes,
      COALESCE(SUM(de.items), 0) as total_items,
      COUNT(DISTINCT de.entry_date) as total_days
    FROM daily_entries de
    WHERE de.producer_id = p_producer_id
      AND de.entry_date >= CURRENT_DATE - (p_current_weeks * 7)
      AND de.entry_date <= CURRENT_DATE
  )
  SELECT 
    ROUND(cp.total_qhh::NUMERIC / NULLIF(cp.total_days, 0), 2) as avg_qhh,
    ROUND(cp.total_quotes::NUMERIC / NULLIF(cp.total_days, 0), 2) as avg_quotes,
    CASE 
      WHEN cp.total_qhh > 0 THEN 
        ROUND((cp.total_quotes::NUMERIC / cp.total_qhh) * 100, 2)
      ELSE 0
    END as avg_close_rate,
    ROUND(cp.total_items::NUMERIC / NULLIF(cp.total_days, 0), 2) as avg_items
  FROM current_period cp;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_producer_baseline TO authenticated;
GRANT EXECUTE ON FUNCTION get_producer_current TO authenticated;

-- ⚠️ DEPRECATED: This function is no longer used in the codebase.
-- YTDPerformanceReport now uses get_producer_trends instead to avoid TypeScript type generation issues.
-- This migration is kept for historical reference but the function can be safely dropped.
--
-- Function to calculate YTD performance metrics with correct QHH deduplication
-- This function ensures that each lead_id is only counted once per producer per month

CREATE OR REPLACE FUNCTION get_ytd_performance(
  from_ym text,  -- 'YYYY-MM'
  to_ym text     -- 'YYYY-MM'
)
RETURNS TABLE (
  producer_id uuid,
  producer_name text,
  entry_month text,
  qhh bigint,
  items bigint,
  sales bigint,
  dials bigint,
  talk_minutes bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH month_series AS (
    SELECT 
      to_char(month_val, 'YYYY-MM') as ym
    FROM generate_series(
      to_date(from_ym, 'YYYY-MM'),
      to_date(to_ym, 'YYYY-MM'),
      interval '1 month'
    ) AS month_val
  ),
  producer_months AS (
    SELECT 
      p.id as producer_id,
      p.display_name as producer_name,
      ms.ym as entry_month
    FROM producers p
    CROSS JOIN month_series ms
    WHERE p.active = true
  ),
  aggregated_data AS (
    SELECT
      pm.producer_id,
      pm.producer_name,
      pm.entry_month,
      -- QHH: Count DISTINCT households per producer per month
      COUNT(DISTINCT qh.lead_id) FILTER (WHERE qh.lead_id IS NOT NULL) as qhh,
      -- Items: Sum from daily_entries
      COALESCE(SUM(de.items_total), 0)::bigint as items,
      -- Sales: Count DISTINCT sold households per producer per month
      COUNT(DISTINCT qh.lead_id) FILTER (WHERE qh.quick_action_status = 'SOLD') as sales,
      -- Dials: Sum from daily_entries
      COALESCE(SUM(de.outbound_dials), 0)::bigint as dials,
      -- Talk: Sum from daily_entries
      COALESCE(SUM(de.talk_minutes), 0)::bigint as talk_minutes
    FROM producer_months pm
    LEFT JOIN daily_entries de 
      ON de.producer_id = pm.producer_id 
      AND de.entry_month = pm.entry_month
    LEFT JOIN quoted_households qh 
      ON qh.daily_entry_id = de.id
    GROUP BY pm.producer_id, pm.producer_name, pm.entry_month
  )
  SELECT 
    ad.producer_id,
    ad.producer_name,
    ad.entry_month,
    ad.qhh,
    ad.items,
    ad.sales,
    ad.dials,
    ad.talk_minutes
  FROM aggregated_data ad
  ORDER BY ad.producer_name, ad.entry_month;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_ytd_performance(text, text) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_ytd_performance IS 'Returns YTD performance metrics with properly deduplicated QHH counts using COUNT(DISTINCT lead_id) to prevent double-counting households quoted on multiple days';

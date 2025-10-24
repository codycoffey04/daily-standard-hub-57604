-- Fix Team Leaderboard QHH and Quotes calculation
-- QHH should count DISTINCT lead_id from quoted_households
-- Quotes should count total quoted_households records

CREATE OR REPLACE FUNCTION public.mtd_producer_metrics(d date DEFAULT NULL)
RETURNS TABLE (
  producer_id uuid, 
  producer_name text, 
  qhh integer, 
  quotes integer, 
  items integer, 
  sales integer,
  conversion numeric, 
  vc_pace numeric, 
  vc_badge text, 
  yesterday_status text
)
LANGUAGE plpgsql 
STABLE 
AS $$
DECLARE 
  ref date; 
  totalwd int; 
  elapsedwd int;
BEGIN
  ref := coalesce(d, public.ct_today_date());
  totalwd := public.working_days_in_month(ref);
  elapsedwd := public.elapsed_working_days_in_month(ref);
  
  RETURN QUERY
  WITH m AS (
    -- Get items (sales) from daily_entries
    SELECT 
      e.producer_id, 
      SUM(e.items_total) as items
    FROM public.daily_entries e
    WHERE e.entry_month = DATE_TRUNC('month', ref)::date 
      AND e.entry_date <= ref
    GROUP BY e.producer_id
  ),
  qhh_quotes AS (
    -- Get QHH (unique households) and Quotes from quoted_households
    SELECT 
      e.producer_id,
      COUNT(DISTINCT qh.lead_id) as qhh,      -- Count UNIQUE households
      COUNT(*) as quotes                        -- Count ALL quote records
    FROM public.daily_entries e
    INNER JOIN public.quoted_households qh ON qh.daily_entry_id = e.id
    WHERE e.entry_month = DATE_TRUNC('month', ref)::date 
      AND e.entry_date <= ref
    GROUP BY e.producer_id
  ),
  sales AS (
    -- Get sold items count from quoted_households with SOLD status
    SELECT 
      e.producer_id,
      COUNT(*) as sales_count
    FROM public.daily_entries e
    INNER JOIN public.quoted_households qh ON qh.daily_entry_id = e.id
    WHERE e.entry_month = DATE_TRUNC('month', ref)::date 
      AND e.entry_date <= ref
      AND qh.quick_action_status = 'SOLD'
    GROUP BY e.producer_id
  ),
  ys AS (
    SELECT producer_id, framework_status 
    FROM public.yesterday_status
  )
  SELECT
    p.id,
    p.display_name,
    COALESCE(qq.qhh, 0)::integer,                    -- Unique households
    COALESCE(qq.quotes, 0)::integer,                 -- Total quotes
    COALESCE(m.items, 0)::integer,                   -- Items from daily_entries
    COALESCE(s.sales_count, 0)::integer,             -- Sales count
    CASE 
      WHEN COALESCE(qq.qhh, 0) = 0 THEN 0 
      ELSE ROUND((COALESCE(s.sales_count, 0)::numeric / qq.qhh::numeric) * 100, 2) 
    END as conversion,
    CASE 
      WHEN elapsedwd = 0 THEN 0 
      ELSE ROUND((COALESCE(m.items, 0)::numeric / (69 * elapsedwd::numeric / totalwd::numeric)) * 100, 2) 
    END as vc_pace,
    CASE
      WHEN elapsedwd = 0 THEN 'Red'
      WHEN (COALESCE(m.items, 0)::numeric / (69 * elapsedwd::numeric / totalwd::numeric)) * 100 >= 100 THEN 'Green'
      WHEN (COALESCE(m.items, 0)::numeric / (69 * elapsedwd::numeric / totalwd::numeric)) * 100 >= 90 THEN 'Amber'
      ELSE 'Red'
    END as vc_badge,
    ys.framework_status
  FROM public.producers p
  LEFT JOIN m ON m.producer_id = p.id
  LEFT JOIN qhh_quotes qq ON qq.producer_id = p.id
  LEFT JOIN sales s ON s.producer_id = p.id
  LEFT JOIN ys ON ys.producer_id = p.id
  WHERE p.active = true;
END;
$$;

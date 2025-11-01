-- Fix get_producer_trends sold_households aggregation bug
-- Issue: sold_hh_agg subquery uses FROM daily_entries e2 without filters,
-- causing incorrect aggregation across large date ranges
-- Solution: Use direct aggregation from source tables, matching quotes_agg pattern

CREATE OR REPLACE FUNCTION public.get_producer_trends(
  producer_ids uuid[],
  from_date date,
  to_date date
)
RETURNS TABLE (
  entry_date date,
  producer_id uuid,
  producer_name text,
  outbound_dials integer,
  talk_minutes integer,
  qhh integer,
  items integer,
  quotes integer,
  sold_items integer,
  sold_households integer,
  sold_premium numeric,
  framework_status text,
  days_top integer,
  days_bottom integer,
  days_outside integer
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.entry_date,
    p.id as producer_id,
    p.display_name as producer_name,
    COALESCE(e.outbound_dials, 0) as outbound_dials,
    COALESCE(e.talk_minutes, 0) as talk_minutes,
    COALESCE(e.qhh_total, 0) as qhh,
    COALESCE(e.items_total, 0) as items,
    COALESCE(quotes_agg.quote_count, 0)::integer as quotes,
    -- FIX: Use items_total directly from daily_entries (already correct)
    COALESCE(e.items_total, 0)::integer as sold_items,
    -- FIX: Sum households from both sources directly
    (COALESCE(sold_hh_qh_agg.sold_hh_qh, 0) + COALESCE(sold_hh_sfoq_agg.sold_hh_sfoq, 0))::integer as sold_households,
    COALESCE(sold_premium_agg.total_premium, 0) as sold_premium,
    COALESCE(es.framework_status, 'Outside') as framework_status,
    CASE WHEN es.framework_status = 'Top' THEN 1 ELSE 0 END as days_top,
    CASE WHEN es.framework_status = 'Bottom' THEN 1 ELSE 0 END as days_bottom,
    CASE WHEN COALESCE(es.framework_status, 'Outside') = 'Outside' THEN 1 ELSE 0 END as days_outside
  FROM public.producers p
  INNER JOIN public.daily_entries e ON e.producer_id = p.id
  LEFT JOIN public.entry_status es ON es.entry_id = e.id
  
  -- Subquery for quotes count (already correct - no changes needed)
  LEFT JOIN (
    SELECT 
      daily_entry_id,
      SUM(COALESCE(lines_quoted, 0)) as quote_count
    FROM public.quoted_households
    GROUP BY daily_entry_id
  ) quotes_agg ON quotes_agg.daily_entry_id = e.id
  
  -- FIX: Direct aggregation for sold households from quoted_households (SOLD status)
  LEFT JOIN (
    SELECT
      daily_entry_id,
      COUNT(CASE WHEN quick_action_status = 'SOLD' THEN 1 END) AS sold_hh_qh
    FROM public.quoted_households
    GROUP BY daily_entry_id
  ) sold_hh_qh_agg ON sold_hh_qh_agg.daily_entry_id = e.id
  
  -- FIX: Direct aggregation for sold households from sales_from_old_quotes
  LEFT JOIN (
    SELECT
      daily_entry_id,
      COUNT(*) AS sold_hh_sfoq
    FROM public.sales_from_old_quotes
    GROUP BY daily_entry_id
  ) sold_hh_sfoq_agg ON sold_hh_sfoq_agg.daily_entry_id = e.id
  
  -- Subquery for sold premium (kept from previous migration - working correctly)
  LEFT JOIN (
    SELECT
      e2.id AS daily_entry_id,
      COALESCE(qh_prem_agg.sold_premium_qh, 0) AS sold_premium_qh,
      COALESCE(sfoq_prem_agg.sold_premium_sfoq, 0) AS sold_premium_sfoq,
      COALESCE(qh_prem_agg.sold_premium_qh, 0) + COALESCE(sfoq_prem_agg.sold_premium_sfoq, 0) AS total_premium
    FROM public.daily_entries e2
    LEFT JOIN (
      SELECT
        daily_entry_id,
        SUM(CASE WHEN quick_action_status = 'SOLD' THEN COALESCE(quoted_premium, 0) ELSE 0 END) AS sold_premium_qh
      FROM public.quoted_households
      GROUP BY daily_entry_id
    ) qh_prem_agg ON qh_prem_agg.daily_entry_id = e2.id
    LEFT JOIN (
      SELECT
        daily_entry_id,
        SUM(COALESCE(premium, 0)) AS sold_premium_sfoq
      FROM public.sales_from_old_quotes
      GROUP BY daily_entry_id
    ) sfoq_prem_agg ON sfoq_prem_agg.daily_entry_id = e2.id
  ) sold_premium_agg ON sold_premium_agg.daily_entry_id = e.id
  
  WHERE 
    e.entry_date >= from_date 
    AND e.entry_date <= to_date
    AND (producer_ids IS NULL OR p.id = ANY(producer_ids))
    AND p.active = true
  ORDER BY e.entry_date, p.display_name;
END;
$$;

COMMENT ON FUNCTION public.get_producer_trends IS 
'Returns daily producer metrics. Fixed sold_households to use direct aggregation matching quotes_agg pattern, preventing incorrect results with large date ranges.';

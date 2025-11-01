-- Fix get_producer_trends to include sold_households (count of households with sales)
-- Adds proper counting of both quoted_households (quick_action_status=SOLD) and sales_from_old_quotes
-- This fixes the undercounting bug where SFOQ sales were not included in the household count

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
    COALESCE(sold_items_agg.total_sold_items, 0)::integer as sold_items,
    COALESCE(sold_hh_agg.total_sold_households, 0)::integer as sold_households,
    COALESCE(sold_premium_agg.total_premium, 0) as sold_premium,
    COALESCE(es.framework_status, 'Outside') as framework_status,
    CASE WHEN es.framework_status = 'Top' THEN 1 ELSE 0 END as days_top,
    CASE WHEN es.framework_status = 'Bottom' THEN 1 ELSE 0 END as days_bottom,
    CASE WHEN COALESCE(es.framework_status, 'Outside') = 'Outside' THEN 1 ELSE 0 END as days_outside
  FROM public.producers p
  INNER JOIN public.daily_entries e ON e.producer_id = p.id
  LEFT JOIN public.entry_status es ON es.entry_id = e.id
  
  -- Subquery for quotes count (already correct - no cartesian product)
  LEFT JOIN (
    SELECT 
      daily_entry_id,
      SUM(COALESCE(lines_quoted, 0)) as quote_count
    FROM public.quoted_households
    GROUP BY daily_entry_id
  ) quotes_agg ON quotes_agg.daily_entry_id = e.id
  
  -- Subquery for sold items (pre-aggregated to avoid cartesian product)
  LEFT JOIN (
    SELECT
      e2.id AS daily_entry_id,
      COALESCE(qh_agg.sold_items_qh, 0) AS sold_items_qh,
      COALESCE(sfoq_agg.sold_items_sfoq, 0) AS sold_items_sfoq,
      COALESCE(qh_agg.sold_items_qh, 0) + COALESCE(sfoq_agg.sold_items_sfoq, 0) AS total_sold_items
    FROM public.daily_entries e2
    LEFT JOIN (
      SELECT
        daily_entry_id,
        SUM(CASE WHEN quick_action_status = 'SOLD' THEN COALESCE(items_sold, 0) ELSE 0 END) AS sold_items_qh
      FROM public.quoted_households
      GROUP BY daily_entry_id
    ) qh_agg ON qh_agg.daily_entry_id = e2.id
    LEFT JOIN (
      SELECT
        daily_entry_id,
        SUM(COALESCE(items_sold, 0)) AS sold_items_sfoq
      FROM public.sales_from_old_quotes
      GROUP BY daily_entry_id
    ) sfoq_agg ON sfoq_agg.daily_entry_id = e2.id
  ) sold_items_agg ON sold_items_agg.daily_entry_id = e.id
  
  -- NEW: Subquery for sold households count (pre-aggregated to avoid cartesian product)
  LEFT JOIN (
    SELECT
      e2.id AS daily_entry_id,
      COALESCE(qh_hh_agg.sold_hh_qh, 0) + COALESCE(sfoq_hh_agg.sold_hh_sfoq, 0) AS total_sold_households
    FROM public.daily_entries e2
    LEFT JOIN (
      SELECT
        daily_entry_id,
        COUNT(CASE WHEN quick_action_status = 'SOLD' THEN 1 END) AS sold_hh_qh
      FROM public.quoted_households
      GROUP BY daily_entry_id
    ) qh_hh_agg ON qh_hh_agg.daily_entry_id = e2.id
    LEFT JOIN (
      SELECT
        daily_entry_id,
        COUNT(*) AS sold_hh_sfoq
      FROM public.sales_from_old_quotes
      GROUP BY daily_entry_id
    ) sfoq_hh_agg ON sfoq_hh_agg.daily_entry_id = e2.id
  ) sold_hh_agg ON sold_hh_agg.daily_entry_id = e.id
  
  -- Subquery for sold premium (pre-aggregated to avoid cartesian product)
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
'Returns daily producer metrics including sold_households (count of households with sales from both quoted_households with quick_action_status=SOLD and sales_from_old_quotes). Uses pre-aggregation to avoid cartesian product bugs.';

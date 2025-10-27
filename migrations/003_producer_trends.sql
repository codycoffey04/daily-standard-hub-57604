-- Migration: Create get_producer_trends function for Producer Trends report
-- This function returns daily metrics for selected producers over a date range

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
    COALESCE(e.sales_total, 0)::integer as sold_items,
    COALESCE(sold_premium_agg.total_premium, 0) as sold_premium,
    COALESCE(es.framework_status, 'Outside') as framework_status,
    CASE WHEN es.framework_status = 'Top' THEN 1 ELSE 0 END as days_top,
    CASE WHEN es.framework_status = 'Bottom' THEN 1 ELSE 0 END as days_bottom,
    CASE WHEN COALESCE(es.framework_status, 'Outside') = 'Outside' THEN 1 ELSE 0 END as days_outside
  FROM public.producers p
  INNER JOIN public.daily_entries e ON e.producer_id = p.id
  LEFT JOIN public.entry_status es ON es.entry_id = e.id
  -- Subquery for quotes count (COUNT of quoted_households per daily entry)
  LEFT JOIN (
    SELECT 
      daily_entry_id,
      COUNT(*) as quote_count
    FROM public.quoted_households
    GROUP BY daily_entry_id
  ) quotes_agg ON quotes_agg.daily_entry_id = e.id
  -- Subquery for sold premium (from both quoted_households AND sales_from_old_quotes)
  LEFT JOIN (
    SELECT 
      de.id as daily_entry_id,
      COALESCE(SUM(CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.quoted_premium ELSE 0 END), 0) +
      COALESCE(SUM(sfq.premium), 0) as total_premium
    FROM public.daily_entries de
    LEFT JOIN public.quoted_households qh ON qh.daily_entry_id = de.id
    LEFT JOIN public.sales_from_old_quotes sfq ON sfq.daily_entry_id = de.id
    GROUP BY de.id
  ) sold_premium_agg ON sold_premium_agg.daily_entry_id = e.id
  WHERE 
    e.entry_date >= from_date 
    AND e.entry_date <= to_date
    AND (producer_ids IS NULL OR p.id = ANY(producer_ids))
    AND p.active = true
  ORDER BY e.entry_date, p.display_name;
END;
$$;

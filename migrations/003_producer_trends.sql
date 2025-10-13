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
    e.outbound_dials,
    e.talk_minutes,
    e.qhh_total as qhh,
    e.items_total as items,
    COALESCE(SUM(des.quotes), 0)::integer as quotes,
    COALESCE(SUM(CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.items_sold ELSE 0 END), 0)::integer as sold_items,
    COALESCE(SUM(CASE WHEN qh.quick_action_status = 'SOLD' THEN qh.quoted_premium ELSE 0 END), 0) as sold_premium,
    COALESCE(MAX(es.framework_status), 'Outside') as framework_status,
    CASE WHEN MAX(es.framework_status) = 'Top' THEN 1 ELSE 0 END as days_top,
    CASE WHEN MAX(es.framework_status) = 'Bottom' THEN 1 ELSE 0 END as days_bottom,
    CASE WHEN COALESCE(MAX(es.framework_status), 'Outside') = 'Outside' THEN 1 ELSE 0 END as days_outside
  FROM public.producers p
  INNER JOIN public.daily_entries e ON e.producer_id = p.id
  LEFT JOIN public.entry_status es ON es.entry_id = e.id
  LEFT JOIN public.daily_entry_sources des ON des.daily_entry_id = e.id
  LEFT JOIN public.quoted_households qh ON qh.daily_entry_id = e.id
  WHERE 
    e.entry_date >= from_date 
    AND e.entry_date <= to_date
    AND (producer_ids IS NULL OR p.id = ANY(producer_ids))
    AND p.active = true
  GROUP BY 
    e.entry_date,
    p.id,
    p.display_name,
    e.outbound_dials,
    e.talk_minutes,
    e.qhh_total,
    e.items_total
  ORDER BY e.entry_date, p.display_name;
END;
$$;

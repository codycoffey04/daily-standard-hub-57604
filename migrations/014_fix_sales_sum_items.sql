-- Fix mtd_producer_metrics to sum items_sold instead of counting households
-- This ensures the sales column shows total items sold, not count of sold households

CREATE OR REPLACE FUNCTION mtd_producer_metrics(d date DEFAULT CURRENT_DATE)
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
) LANGUAGE plpgsql AS $$
DECLARE
  ref date := COALESCE(d, CURRENT_DATE);
  days_elapsed integer;
  working_days integer;
BEGIN
  -- Calculate working days in month and days elapsed
  SELECT COUNT(*) INTO working_days
  FROM generate_series(
    DATE_TRUNC('month', ref)::date,
    (DATE_TRUNC('month', ref) + INTERVAL '1 month - 1 day')::date,
    '1 day'::interval
  ) AS day_date
  WHERE EXTRACT(DOW FROM day_date) NOT IN (0, 6);

  SELECT COUNT(*) INTO days_elapsed
  FROM generate_series(
    DATE_TRUNC('month', ref)::date,
    ref,
    '1 day'::interval
  ) AS day_date
  WHERE EXTRACT(DOW FROM day_date) NOT IN (0, 6);

  RETURN QUERY
  WITH qhh_data AS (
    SELECT 
      e.producer_id,
      COUNT(DISTINCT qh.lead_id) as qhh_count
    FROM public.daily_entries e
    INNER JOIN public.quoted_households qh ON qh.daily_entry_id = e.id
    WHERE e.entry_month = DATE_TRUNC('month', ref)::date 
      AND e.entry_date <= ref
    GROUP BY e.producer_id
  ),
  quotes_data AS (
    SELECT 
      e.producer_id,
      COUNT(*) as quotes_count
    FROM public.daily_entries e
    INNER JOIN public.quoted_households qh ON qh.daily_entry_id = e.id
    WHERE e.entry_month = DATE_TRUNC('month', ref)::date 
      AND e.entry_date <= ref
    GROUP BY e.producer_id
  ),
  sales AS (
    SELECT 
      e.producer_id,
      COALESCE(SUM(qh.items_sold), 0)::integer as sales_count
    FROM public.daily_entries e
    INNER JOIN public.quoted_households qh ON qh.daily_entry_id = e.id
    WHERE e.entry_month = DATE_TRUNC('month', ref)::date 
      AND e.entry_date <= ref
      AND qh.quick_action_status = 'SOLD'
      AND qh.items_sold > 0
    GROUP BY e.producer_id
  ),
  items_data AS (
    SELECT 
      e.producer_id,
      SUM(e.items_total) as items_sum
    FROM public.daily_entries e
    WHERE e.entry_month = DATE_TRUNC('month', ref)::date 
      AND e.entry_date <= ref
    GROUP BY e.producer_id
  ),
  yesterday_data AS (
    SELECT 
      producer_id,
      status as yesterday_status
    FROM public.yesterday_status
    WHERE status_date = ref - INTERVAL '1 day'
  )
  SELECT 
    p.id as producer_id,
    p.name as producer_name,
    COALESCE(q.qhh_count, 0)::integer as qhh,
    COALESCE(qt.quotes_count, 0)::integer as quotes,
    COALESCE(i.items_sum, 0)::integer as items,
    COALESCE(s.sales_count, 0)::integer as sales,
    CASE 
      WHEN COALESCE(q.qhh_count, 0) > 0 
      THEN ROUND((COALESCE(s.sales_count, 0)::numeric / q.qhh_count) * 100, 1)
      ELSE 0
    END as conversion,
    CASE 
      WHEN days_elapsed > 0 
      THEN ROUND((COALESCE(s.sales_count, 0)::numeric / days_elapsed) * working_days, 1)
      ELSE 0
    END as vc_pace,
    CASE 
      WHEN days_elapsed > 0 THEN
        CASE 
          WHEN (COALESCE(s.sales_count, 0)::numeric / days_elapsed) * working_days >= 60 THEN '🔥'
          WHEN (COALESCE(s.sales_count, 0)::numeric / days_elapsed) * working_days >= 40 THEN '✅'
          WHEN (COALESCE(s.sales_count, 0)::numeric / days_elapsed) * working_days >= 20 THEN '⚠️'
          ELSE '❌'
        END
      ELSE '—'
    END as vc_badge,
    COALESCE(y.yesterday_status, '—') as yesterday_status
  FROM public.producers p
  LEFT JOIN qhh_data q ON p.id = q.producer_id
  LEFT JOIN quotes_data qt ON p.id = qt.producer_id
  LEFT JOIN sales s ON p.id = s.producer_id
  LEFT JOIN items_data i ON p.id = i.producer_id
  LEFT JOIN yesterday_data y ON p.id = y.producer_id
  WHERE p.is_active = true
  ORDER BY p.name;
END;
$$;

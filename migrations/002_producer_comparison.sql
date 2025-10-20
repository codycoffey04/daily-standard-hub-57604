-- Migration: Create get_producer_comparison function for Sales by Producer report
-- This function calculates comprehensive producer metrics including framework status,
-- daily averages, totals, and commission estimates

CREATE OR REPLACE FUNCTION public.get_producer_comparison(
  from_date date,
  to_date date
)
RETURNS TABLE (
  producer_id uuid,
  producer_name text,
  days_worked integer,
  days_top integer,
  days_bottom integer,
  days_outside integer,
  framework_compliance_pct numeric,
  avg_daily_qhh numeric,
  avg_daily_items numeric,
  total_qhh integer,
  total_quotes integer,
  total_items integer,
  total_premium numeric,
  total_commission numeric,
  total_sold_items integer,
  total_sold_premium numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH producer_days AS (
    -- Count days worked and framework status breakdown
    SELECT 
      e.producer_id,
      COUNT(DISTINCT e.entry_date) as days_worked,
      COUNT(DISTINCT CASE WHEN es.framework_status = 'Top' THEN e.entry_date END) as days_top,
      COUNT(DISTINCT CASE WHEN es.framework_status = 'Bottom' THEN e.entry_date END) as days_bottom,
      COUNT(DISTINCT CASE WHEN es.framework_status = 'Outside' THEN e.entry_date END) as days_outside
    FROM public.daily_entries e
    LEFT JOIN public.entry_status es ON es.entry_id = e.id
    WHERE e.entry_date >= from_date AND e.entry_date <= to_date
    GROUP BY e.producer_id
  ),
  producer_metrics AS (
    -- Calculate sum metrics
    SELECT 
      e.producer_id,
      COALESCE(SUM(e.qhh_total), 0) as total_qhh,
      COALESCE(SUM(e.items_total), 0) as total_items
    FROM public.daily_entries e
    WHERE e.entry_date >= from_date AND e.entry_date <= to_date
    GROUP BY e.producer_id
  ),
  producer_quotes AS (
    -- Calculate total quotes
    SELECT 
      e.producer_id,
      COALESCE(SUM(des.quotes), 0) as total_quotes
    FROM public.daily_entries e
    JOIN public.daily_entry_sources des ON des.daily_entry_id = e.id
    WHERE e.entry_date >= from_date AND e.entry_date <= to_date
    GROUP BY e.producer_id
  ),
  producer_premiums AS (
    -- Calculate premiums and commissions from quoted_households
    SELECT 
      e.producer_id,
      COALESCE(SUM(qh.quoted_premium), 0) as total_premium,
      COALESCE(SUM(qh.items_sold) FILTER (WHERE qh.quick_action_status = 'SOLD'), 0) as total_sold_items,
      COALESCE(SUM(qh.quoted_premium) FILTER (WHERE qh.quick_action_status = 'SOLD'), 0) as total_sold_premium,
      COALESCE(SUM(qh.quoted_premium) FILTER (WHERE qh.quick_action_status = 'SOLD') * 0.10, 0) as total_commission
    FROM public.daily_entries e
    LEFT JOIN public.quoted_households qh ON qh.daily_entry_id = e.id
    WHERE e.entry_date >= from_date AND e.entry_date <= to_date
    GROUP BY e.producer_id
  )
  SELECT 
    p.id,
    p.display_name,
    COALESCE(pd.days_worked, 0)::integer,
    COALESCE(pd.days_top, 0)::integer,
    COALESCE(pd.days_bottom, 0)::integer,
    COALESCE(pd.days_outside, 0)::integer,
    -- Framework compliance % = (days_top / days_worked) * 100
    CASE 
      WHEN COALESCE(pd.days_worked, 0) > 0 
      THEN ROUND((pd.days_top::numeric / pd.days_worked::numeric) * 100, 2)
      ELSE 0 
    END as framework_compliance_pct,
    -- Avg daily metrics
    CASE 
      WHEN COALESCE(pd.days_worked, 0) > 0 
      THEN ROUND(pm.total_qhh::numeric / pd.days_worked::numeric, 2)
      ELSE 0 
    END as avg_daily_qhh,
    CASE 
      WHEN COALESCE(pd.days_worked, 0) > 0 
      THEN ROUND(pm.total_items::numeric / pd.days_worked::numeric, 2)
      ELSE 0 
    END as avg_daily_items,
    COALESCE(pm.total_qhh, 0)::integer,
    COALESCE(pq.total_quotes, 0)::integer,
    COALESCE(pm.total_items, 0)::integer,
    COALESCE(pp.total_premium, 0),
    COALESCE(pp.total_commission, 0),
    COALESCE(pp.total_sold_items, 0)::integer,
    COALESCE(pp.total_sold_premium, 0)
  FROM public.producers p
  LEFT JOIN producer_days pd ON pd.producer_id = p.id
  LEFT JOIN producer_metrics pm ON pm.producer_id = p.id
  LEFT JOIN producer_quotes pq ON pq.producer_id = p.id
  LEFT JOIN producer_premiums pp ON pp.producer_id = p.id
  WHERE p.active = true
  ORDER BY 
    CASE 
      WHEN COALESCE(pd.days_worked, 0) > 0 
      THEN (pd.days_top::numeric / pd.days_worked::numeric) * 100
      ELSE 0 
    END DESC;
END;
$$;

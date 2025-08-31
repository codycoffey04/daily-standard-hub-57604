-- Fix conversion rate calculation in mtd_producer_metrics function
-- Change from quotes/qhh to (sales/qhh)*100 to get correct percentage
CREATE OR REPLACE FUNCTION public.mtd_producer_metrics(d date DEFAULT CURRENT_DATE)
 RETURNS TABLE(producer_id uuid, producer_name text, qhh integer, quotes integer, items integer, sales integer, conversion numeric, vc_pace numeric, vc_badge text, yesterday_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH producer_entries AS (
    -- Get daily entries with totals (not multiplied)
    SELECT 
      p.id as producer_id,
      p.display_name as producer_name,
      COALESCE(SUM(de.items_total), 0) as total_items,
      COALESCE(SUM(de.sales_total), 0) as total_sales
    FROM public.producers p
    LEFT JOIN public.daily_entries de ON p.id = de.producer_id 
      AND de.entry_date >= DATE_TRUNC('month', d)
      AND de.entry_date <= d
    WHERE p.active = true
    GROUP BY p.id, p.display_name
  ),
  producer_sources AS (
    -- Get source-level data (QHH, quotes) aggregated properly
    SELECT 
      p.id as producer_id,
      COALESCE(SUM(des.qhh), 0) as total_qhh,
      COALESCE(SUM(des.quotes), 0) as total_quotes
    FROM public.producers p
    LEFT JOIN public.daily_entries de ON p.id = de.producer_id 
      AND de.entry_date >= DATE_TRUNC('month', d)
      AND de.entry_date <= d
    LEFT JOIN public.daily_entry_sources des ON de.id = des.daily_entry_id
    WHERE p.active = true
    GROUP BY p.id
  )
  SELECT 
    pe.producer_id,
    pe.producer_name,
    ps.total_qhh::INTEGER as qhh,
    ps.total_quotes::INTEGER as quotes,
    pe.total_items::INTEGER as items,
    pe.total_sales::INTEGER as sales,
    CASE 
      WHEN ps.total_qhh = 0 THEN 0
      ELSE ROUND(pe.total_sales::NUMERIC / ps.total_qhh * 100, 2)
    END as conversion,
    CASE 
      WHEN pe.total_items = 0 THEN 0
      ELSE ROUND((pe.total_items * 30 / EXTRACT(DAY FROM d))::NUMERIC, 1)
    END as vc_pace,
    CASE 
      WHEN (pe.total_items * 30 / EXTRACT(DAY FROM d)) >= 12 THEN 'Green'
      WHEN (pe.total_items * 30 / EXTRACT(DAY FROM d)) >= 8 THEN 'Amber'
      ELSE 'Red'
    END as vc_badge,
    COALESCE(ys.framework_status, 'Outside') as yesterday_status
  FROM producer_entries pe
  JOIN producer_sources ps ON pe.producer_id = ps.producer_id
  LEFT JOIN public.yesterday_status ys ON pe.producer_id = ys.producer_id
  ORDER BY vc_pace DESC;
END;
$function$
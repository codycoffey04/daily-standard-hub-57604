-- Fix MTD producer metrics to use daily_entries.items_total for historical accuracy
CREATE OR REPLACE FUNCTION public.mtd_producer_metrics(d date DEFAULT CURRENT_DATE)
 RETURNS TABLE(producer_id uuid, producer_name text, qhh integer, quotes integer, items integer, conversion numeric, vc_pace numeric, vc_badge text, yesterday_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as producer_id,
    p.display_name as producer_name,
    COALESCE(SUM(des.qhh), 0)::INTEGER as qhh,
    COALESCE(SUM(des.quotes), 0)::INTEGER as quotes,
    COALESCE(SUM(de.items_total), 0)::INTEGER as items,
    CASE 
      WHEN COALESCE(SUM(des.qhh), 0) = 0 THEN 0
      ELSE ROUND(COALESCE(SUM(des.quotes), 0)::NUMERIC / COALESCE(SUM(des.qhh), 1), 2)
    END as conversion,
    CASE 
      WHEN COALESCE(SUM(de.items_total), 0) = 0 THEN 0
      ELSE ROUND((COALESCE(SUM(de.items_total), 0) * 30 / EXTRACT(DAY FROM d))::NUMERIC, 1)
    END as vc_pace,
    CASE 
      WHEN (COALESCE(SUM(de.items_total), 0) * 30 / EXTRACT(DAY FROM d)) >= 12 THEN 'Green'
      WHEN (COALESCE(SUM(de.items_total), 0) * 30 / EXTRACT(DAY FROM d)) >= 8 THEN 'Amber'
      ELSE 'Red'
    END as vc_badge,
    COALESCE(ys.framework_status, 'Outside') as yesterday_status
  FROM public.producers p
  LEFT JOIN public.daily_entries de ON p.id = de.producer_id 
    AND de.entry_date >= DATE_TRUNC('month', d)
    AND de.entry_date <= d
  LEFT JOIN public.daily_entry_sources des ON de.id = des.daily_entry_id
  LEFT JOIN public.yesterday_status ys ON p.id = ys.producer_id
  WHERE p.active = true
  GROUP BY p.id, p.display_name, ys.framework_status
  ORDER BY vc_pace DESC;
END;
$function$
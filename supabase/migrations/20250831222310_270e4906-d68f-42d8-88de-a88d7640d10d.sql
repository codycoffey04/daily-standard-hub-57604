-- Update mtd_producer_metrics to include office-wide totals
DROP FUNCTION IF EXISTS public.mtd_producer_metrics(date);

CREATE OR REPLACE FUNCTION public.mtd_producer_metrics(d date DEFAULT CURRENT_DATE)
 RETURNS TABLE(
   producer_id uuid, 
   producer_name text, 
   qhh integer, 
   quotes integer, 
   items integer, 
   sales integer, 
   conversion numeric, 
   vc_pace numeric, 
   vc_badge text, 
   yesterday_status text,
   office_total_items integer,
   office_vc_pace numeric,
   office_vc_badge text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_office_total_items integer;
  v_office_vc_pace numeric;
  v_office_vc_badge text;
BEGIN
  -- Calculate office-wide totals first
  SELECT 
    COALESCE(SUM(de.items_total), 0) 
  INTO v_office_total_items
  FROM public.producers p
  INNER JOIN public.daily_entries de ON p.id = de.producer_id 
    AND de.entry_date >= DATE_TRUNC('month', d)
    AND de.entry_date <= d
  WHERE p.active = true;
  
  -- Calculate office VC pace
  v_office_vc_pace := CASE 
    WHEN v_office_total_items = 0 THEN 0
    ELSE ROUND((v_office_total_items * 30.0 / EXTRACT(DAY FROM d)), 1)
  END;
  
  -- Calculate office VC badge based on pace toward 69
  v_office_vc_badge := CASE 
    WHEN v_office_vc_pace >= 69 THEN 'Green'
    WHEN v_office_vc_pace >= 52 THEN 'Amber'  -- 75% of target
    ELSE 'Red'
  END;

  RETURN QUERY
  WITH producer_entries AS (
    -- Get daily entries with totals - include ALL producers with data (not just active)
    SELECT 
      p.id as producer_id,
      p.display_name as producer_name,
      COALESCE(SUM(de.items_total), 0) as total_items,
      COALESCE(SUM(de.sales_total), 0) as total_sales,
      COALESCE(SUM(de.qhh_total), 0) as total_qhh
    FROM public.producers p
    INNER JOIN public.daily_entries de ON p.id = de.producer_id 
      AND de.entry_date >= DATE_TRUNC('month', d)
      AND de.entry_date <= d
    GROUP BY p.id, p.display_name
  ),
  producer_sources AS (
    -- Get source-level data (quotes) aggregated properly
    SELECT 
      p.id as producer_id,
      COALESCE(SUM(des.quotes), 0) as total_quotes
    FROM public.producers p
    INNER JOIN public.daily_entries de ON p.id = de.producer_id 
      AND de.entry_date >= DATE_TRUNC('month', d)
      AND de.entry_date <= d
    INNER JOIN public.daily_entry_sources des ON de.id = des.daily_entry_id
    GROUP BY p.id
  )
  SELECT 
    pe.producer_id,
    pe.producer_name,
    pe.total_qhh::INTEGER as qhh,
    COALESCE(ps.total_quotes, 0)::INTEGER as quotes,
    pe.total_items::INTEGER as items,
    pe.total_sales::INTEGER as sales,
    CASE 
      WHEN pe.total_qhh = 0 THEN 0
      ELSE ROUND(pe.total_sales::NUMERIC / pe.total_qhh * 100, 2)
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
    COALESCE(ys.framework_status, 'Outside') as yesterday_status,
    v_office_total_items as office_total_items,
    v_office_vc_pace as office_vc_pace,
    v_office_vc_badge as office_vc_badge
  FROM producer_entries pe
  LEFT JOIN producer_sources ps ON pe.producer_id = ps.producer_id
  LEFT JOIN public.yesterday_status ys ON pe.producer_id = ys.producer_id
  ORDER BY vc_pace DESC;
END;
$function$
-- Add sales_total column to daily_entries table
ALTER TABLE public.daily_entries 
ADD COLUMN sales_total integer NOT NULL DEFAULT 0;

-- Add sales column to daily_entry_sources table
ALTER TABLE public.daily_entry_sources 
ADD COLUMN sales integer NOT NULL DEFAULT 0;

-- Update mtd_producer_metrics function to include sales
CREATE OR REPLACE FUNCTION public.mtd_producer_metrics(d date DEFAULT CURRENT_DATE)
 RETURNS TABLE(producer_id uuid, producer_name text, qhh integer, quotes integer, items integer, sales integer, conversion numeric, vc_pace numeric, vc_badge text, yesterday_status text)
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
    COALESCE(SUM(de.sales_total), 0)::INTEGER as sales,
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
$function$;

-- Update save_daily_entry function to handle sales data
CREATE OR REPLACE FUNCTION public.save_daily_entry(p_producer_email text, p_entry_date date, p_outbound_dials integer, p_talk_minutes integer, p_items_total integer, p_sales_total integer DEFAULT 0, p_by_source jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_producer_id UUID;
  v_entry_id UUID;
  v_source JSONB;
BEGIN
  -- Get producer ID from email
  SELECT id INTO v_producer_id 
  FROM public.producers 
  WHERE email = p_producer_email;
  
  IF v_producer_id IS NULL THEN
    RAISE EXCEPTION 'Producer not found with email: %', p_producer_email;
  END IF;
  
  -- Insert or update daily entry
  INSERT INTO public.daily_entries (
    producer_id, 
    entry_date, 
    entry_month,
    outbound_dials, 
    talk_minutes, 
    items_total,
    sales_total,
    qhh_total
  ) VALUES (
    v_producer_id,
    p_entry_date,
    TO_CHAR(p_entry_date, 'YYYY-MM'),
    p_outbound_dials,
    p_talk_minutes,
    p_items_total,
    p_sales_total,
    (SELECT COALESCE(SUM((value->>'qhh')::INTEGER), 0) FROM jsonb_array_elements(p_by_source))
  )
  ON CONFLICT (producer_id, entry_date) 
  DO UPDATE SET
    outbound_dials = EXCLUDED.outbound_dials,
    talk_minutes = EXCLUDED.talk_minutes,
    items_total = EXCLUDED.items_total,
    sales_total = EXCLUDED.sales_total,
    qhh_total = EXCLUDED.qhh_total,
    updated_at = now()
  RETURNING id INTO v_entry_id;
  
  -- Delete existing sources for this entry
  DELETE FROM public.daily_entry_sources WHERE daily_entry_id = v_entry_id;
  
  -- Insert source data
  FOR v_source IN SELECT * FROM jsonb_array_elements(p_by_source)
  LOOP
    INSERT INTO public.daily_entry_sources (
      daily_entry_id,
      source_id,
      qhh,
      quotes,
      items,
      sales
    ) VALUES (
      v_entry_id,
      (v_source->>'source_id')::UUID,
      (v_source->>'qhh')::INTEGER,
      (v_source->>'quotes')::INTEGER,
      (v_source->>'items')::INTEGER,
      COALESCE((v_source->>'sales')::INTEGER, 0)
    );
  END LOOP;
  
  RETURN v_entry_id;
END;
$function$;
-- Drop the old function signature first
DROP FUNCTION IF EXISTS public.get_qhh_details_for_review(uuid);

-- Recreate with new schema
CREATE OR REPLACE FUNCTION public.get_qhh_details_for_review(p_daily_entry_id uuid)
 RETURNS TABLE(
   id uuid,
   zip_code character varying,
   product_lines text[],
   lines_quoted integer,
   is_bundle boolean,
   quoted_premium numeric,
   lead_source_id uuid,
   current_carrier character varying,
   lead_id character varying,
   qcn character varying,
   notes text,
   quick_action_status text,
   opted_into_hearsay boolean,
   source_name text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    qh.id,
    qh.zip_code,
    qh.product_lines,
    qh.lines_quoted,
    qh.is_bundle,
    qh.quoted_premium,
    qh.lead_source_id,
    qh.current_carrier,
    qh.lead_id,
    qh.qcn,
    qh.notes,
    qh.quick_action_status,
    qh.opted_into_hearsay,
    COALESCE(s.name, 'Unknown') as source_name
  FROM public.quoted_households qh
  LEFT JOIN public.sources s ON qh.lead_source_id = s.id
  WHERE qh.daily_entry_id = p_daily_entry_id
  ORDER BY qh.created_at ASC;
END;
$function$;
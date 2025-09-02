-- Create a function to get QHH details with source information for accountability reviews
CREATE OR REPLACE FUNCTION public.get_qhh_details_for_review(p_daily_entry_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  phone_number text,
  policies_quoted integer,
  lead_source_id uuid,
  notes text,
  quick_action_status text,
  opted_into_hearsay boolean,
  source_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qh.id,
    qh.full_name,
    qh.phone_number,
    qh.policies_quoted,
    qh.lead_source_id,
    qh.notes,
    qh.quick_action_status,
    qh.opted_into_hearsay,
    COALESCE(s.name, 'Unknown') as source_name
  FROM public.quoted_households qh
  LEFT JOIN public.sources s ON qh.lead_source_id = s.id
  WHERE qh.daily_entry_id = p_daily_entry_id
  ORDER BY qh.created_at ASC;
END;
$$;
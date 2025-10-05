-- Fix security linter warnings

-- Fix function search paths for all existing functions
CREATE OR REPLACE FUNCTION public.current_producer_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT producer_id FROM public.profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.is_owner_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.is_manager_or_owner(auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.jsonb_diff(l jsonb, r jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_object_agg(key, value)
  FROM (
    SELECT key, value
    FROM jsonb_each(l)
    WHERE l->key <> r->key OR r->key IS NULL
  ) t;
$$;
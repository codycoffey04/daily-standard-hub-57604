-- 1) Update current_producer_id() to use SECURITY DEFINER (bypass profiles RLS)
CREATE OR REPLACE FUNCTION public.current_producer_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.producer_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.current_producer_id() TO authenticated;

-- 2) Create safe_is_manager_or_owner() that never throws exceptions
CREATE OR REPLACE FUNCTION public.safe_is_manager_or_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean := false;
BEGIN
  BEGIN
    SELECT COALESCE(is_manager_or_owner(auth.uid()), false) INTO ok;
  EXCEPTION WHEN OTHERS THEN
    ok := false;
  END;
  RETURN ok;
END;
$$;
GRANT EXECUTE ON FUNCTION public.safe_is_manager_or_owner() TO authenticated;

-- 3) Ensure base privileges exist
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_entries TO authenticated;

-- 4) Replace RLS policies with robust versions
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_entries_select ON public.daily_entries;
DROP POLICY IF EXISTS daily_entries_insert ON public.daily_entries;
DROP POLICY IF EXISTS daily_entries_update ON public.daily_entries;
DROP POLICY IF EXISTS daily_entries_delete ON public.daily_entries;

-- SELECT: producers see their own, managers/owners see all, creator always sees their rows
CREATE POLICY daily_entries_select
ON public.daily_entries
FOR SELECT
USING (
  public.safe_is_manager_or_owner()
  OR created_by = auth.uid()
  OR producer_id = public.current_producer_id()
);

-- INSERT: producers can create for self; managers/owners can create for anyone
CREATE POLICY daily_entries_insert
ON public.daily_entries
FOR INSERT
WITH CHECK (
  public.safe_is_manager_or_owner()
  OR producer_id = public.current_producer_id()
);

-- UPDATE: same as SELECT for row access
CREATE POLICY daily_entries_update
ON public.daily_entries
FOR UPDATE
USING (
  public.safe_is_manager_or_owner()
  OR created_by = auth.uid()
  OR producer_id = public.current_producer_id()
)
WITH CHECK (
  public.safe_is_manager_or_owner()
  OR created_by = auth.uid()
  OR producer_id = public.current_producer_id()
);

-- DELETE: managers/owners only
CREATE POLICY daily_entries_delete
ON public.daily_entries
FOR DELETE
USING ( public.safe_is_manager_or_owner() );
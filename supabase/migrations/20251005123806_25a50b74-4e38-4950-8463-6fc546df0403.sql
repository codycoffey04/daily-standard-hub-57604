-- CRITICAL SECURITY FIX: Part 2 - Clean policies and apply secure RLS

-- Step 1: Drop ALL existing policies (complete cleanup)
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('profiles', 'quoted_households', 'daily_entries', 'daily_entry_sources', 'accountability_reviews', 'user_roles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Step 2: Create NEW SECURE policies

-- USER_ROLES: Only users can see their own roles, only owners can manage
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only owners can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- PROFILES: Users see own profile OR managers/owners see all
CREATE POLICY "Users see own profile or managers see all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() 
  OR public.is_manager_or_owner(auth.uid())
);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- QUOTED_HOUSEHOLDS: Users see own records OR managers/owners see all
CREATE POLICY "Users see own households or managers see all"
ON public.quoted_households
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_manager_or_owner(auth.uid())
);

CREATE POLICY "Users insert own households"
ON public.quoted_households
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users update own households"
ON public.quoted_households
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Managers can delete households"
ON public.quoted_households
FOR DELETE
TO authenticated
USING (public.is_manager_or_owner(auth.uid()));

-- DAILY_ENTRIES: Producers see own data OR managers/owners see all
CREATE POLICY "Producers see own entries or managers see all"
ON public.daily_entries
FOR SELECT
TO authenticated
USING (
  producer_id = (SELECT producer_id FROM public.profiles WHERE id = auth.uid())
  OR created_by = auth.uid()
  OR public.is_manager_or_owner(auth.uid())
);

CREATE POLICY "Authenticated users can insert entries"
ON public.daily_entries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own entries or managers update all"
ON public.daily_entries
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_manager_or_owner(auth.uid())
);

-- DAILY_ENTRY_SOURCES: Match parent daily_entry access
CREATE POLICY "Users see sources for accessible entries"
ON public.daily_entry_sources
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.daily_entries de
    WHERE de.id = daily_entry_sources.daily_entry_id
    AND (
      de.producer_id = (SELECT producer_id FROM public.profiles WHERE id = auth.uid())
      OR de.created_by = auth.uid()
      OR public.is_manager_or_owner(auth.uid())
    )
  )
);

CREATE POLICY "Users manage sources for accessible entries"
ON public.daily_entry_sources
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.daily_entries de
    WHERE de.id = daily_entry_sources.daily_entry_id
    AND (
      de.created_by = auth.uid()
      OR public.is_manager_or_owner(auth.uid())
    )
  )
);

-- ACCOUNTABILITY_REVIEWS: Reviewers and managers can access
CREATE POLICY "Managers view all reviews"
ON public.accountability_reviews
FOR SELECT
TO authenticated
USING (public.is_manager_or_owner(auth.uid()));

CREATE POLICY "Reviewers and managers create reviews"
ON public.accountability_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'reviewer')
  OR public.is_manager_or_owner(auth.uid())
);

CREATE POLICY "Reviewers update own reviews or managers update all"
ON public.accountability_reviews
FOR UPDATE
TO authenticated
USING (
  reviewer_id = auth.uid()
  OR public.is_manager_or_owner(auth.uid())
)
WITH CHECK (
  reviewer_id = auth.uid()
  OR public.is_manager_or_owner(auth.uid())
);

CREATE POLICY "Owners can delete reviews"
ON public.accountability_reviews
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));
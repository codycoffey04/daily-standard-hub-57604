-- CRITICAL SECURITY FIX: Separate roles table + secure RLS policies

-- Step 1: Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'producer', 'reviewer');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 2: Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role 
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function for manager or owner check
CREATE OR REPLACE FUNCTION public.is_manager_or_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('manager', 'owner')
  )
$$;

-- Step 4: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_daily_entries_producer_created ON public.daily_entries(producer_id, created_by);
CREATE INDEX IF NOT EXISTS idx_quoted_households_created_by ON public.quoted_households(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_producer_id ON public.profiles(producer_id);

-- Step 5: RLS policy for user_roles table
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

-- Step 6: Drop ALL existing insecure policies
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;

DROP POLICY IF EXISTS "Users can view all quoted households" ON public.quoted_households;
DROP POLICY IF EXISTS "Users can insert their own quoted households" ON public.quoted_households;
DROP POLICY IF EXISTS "Users can update their own quoted households" ON public.quoted_households;

DROP POLICY IF EXISTS "Allow authenticated selects" ON public.daily_entries;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.daily_entries;
DROP POLICY IF EXISTS "Allow updates by creator or admin" ON public.daily_entries;

DROP POLICY IF EXISTS "Users can view related daily entry sources" ON public.daily_entry_sources;
DROP POLICY IF EXISTS "Users can manage related daily entry sources" ON public.daily_entry_sources;

DROP POLICY IF EXISTS "Admins can view accountability reviews" ON public.accountability_reviews;
DROP POLICY IF EXISTS "Reviewers and admins can create accountability reviews" ON public.accountability_reviews;
DROP POLICY IF EXISTS "Reviewers and admins can update their accountability reviews" ON public.accountability_reviews;
DROP POLICY IF EXISTS "Owners can delete accountability reviews" ON public.accountability_reviews;

-- Step 7: Create NEW SECURE policies

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
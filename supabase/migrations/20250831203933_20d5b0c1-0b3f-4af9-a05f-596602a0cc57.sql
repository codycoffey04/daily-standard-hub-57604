-- Step 1: Update profiles table to allow 'reviewer' role
-- First check if 'reviewer' is already in the role constraint
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    
    -- Add new constraint with reviewer role included
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('owner', 'manager', 'producer', 'reviewer'));
END $$;

-- Step 2: Enable RLS on accountability_reviews table
ALTER TABLE public.accountability_reviews ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for accountability_reviews

-- Policy for INSERT: Allow users with role 'reviewer', 'manager', or 'owner'
CREATE POLICY "Reviewers and admins can create accountability reviews"
ON public.accountability_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('reviewer', 'manager', 'owner')
  )
);

-- Policy for SELECT: Allow users with role 'manager' or 'owner' (admins only)
CREATE POLICY "Admins can view accountability reviews"
ON public.accountability_reviews
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('manager', 'owner')
  )
);

-- Policy for UPDATE: Allow users with role 'reviewer', 'manager', or 'owner' who created the review
CREATE POLICY "Reviewers and admins can update their accountability reviews"
ON public.accountability_reviews
FOR UPDATE
TO authenticated
USING (
  reviewer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('manager', 'owner')
  )
)
WITH CHECK (
  reviewer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('manager', 'owner')
  )
);

-- Policy for DELETE: Only 'owner' role for data management
CREATE POLICY "Owners can delete accountability reviews"
ON public.accountability_reviews
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'owner'
  )
);
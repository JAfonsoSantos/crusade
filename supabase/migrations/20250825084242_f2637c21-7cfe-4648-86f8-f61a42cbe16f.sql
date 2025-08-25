-- Force stricter RLS enforcement on companies table

-- First, revoke all public access completely
REVOKE ALL ON public.companies FROM PUBLIC;
REVOKE ALL ON public.companies FROM anon;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view only their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update only their own company" ON public.companies;
DROP POLICY IF EXISTS "System only company creation" ON public.companies;
DROP POLICY IF EXISTS "Restrict company deletion" ON public.companies;

-- Force RLS to be enabled
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;

-- Create ultra-restrictive policies that should prevent email harvesting

-- Only allow viewing if user is explicitly linked to this specific company
CREATE POLICY "strict_company_read" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (
  -- Only allow if this user belongs to this exact company
  id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND company_id IS NOT NULL
  )
);

-- Only allow updates if user belongs to the company 
CREATE POLICY "strict_company_update" 
ON public.companies 
FOR UPDATE 
TO authenticated
USING (
  id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND company_id IS NOT NULL
  )
)
WITH CHECK (
  id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND company_id IS NOT NULL
  )
);

-- Allow admins to manage everything (but be very restrictive about who is admin)
CREATE POLICY "admin_company_access" 
ON public.companies 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Company creation: Only if user has no company yet
CREATE POLICY "company_creation_restricted" 
ON public.companies 
FOR INSERT 
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND company_id IS NOT NULL
  )
);

-- Deletion: Only admins
CREATE POLICY "company_deletion_admin_only" 
ON public.companies 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Grant minimal necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
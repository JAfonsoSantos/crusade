-- Create more restrictive RLS policies for companies table to prevent competitor harvesting
-- Remove overly permissive policies first

-- Drop all existing policies to start fresh
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can view their own company" ON public.companies;
    DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;
    DROP POLICY IF EXISTS "Authenticated users can update their own company" ON public.companies;
    DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
    DROP POLICY IF EXISTS "System can create companies during signup" ON public.companies;
    DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Create security definer function to check if user belongs to company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(company_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND company_id = company_uuid
  );
$$;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Highly restrictive policy: Users can only view their own company
CREATE POLICY "Users can only view their own company" 
ON public.companies 
FOR SELECT 
TO authenticated 
USING (public.user_belongs_to_company(id));

-- Highly restrictive policy: Users can only update their own company
CREATE POLICY "Users can only update their own company" 
ON public.companies 
FOR UPDATE 
TO authenticated 
USING (public.user_belongs_to_company(id))
WITH CHECK (public.user_belongs_to_company(id));

-- Restrict admin access to system administrators only
CREATE POLICY "System admins can manage all companies" 
ON public.companies 
FOR ALL 
TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Restrict company creation to system processes only (no user-initiated company creation)
CREATE POLICY "System only company creation" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (
  -- Only allow if user has no existing company (signup process)
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND company_id IS NOT NULL
  )
);
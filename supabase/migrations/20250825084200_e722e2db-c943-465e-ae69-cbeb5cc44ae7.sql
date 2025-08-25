-- Fix company email harvesting vulnerability by strengthening RLS policies

-- First, let's check what the current user's company_id is
-- The issue is that RLS policies may not be properly restricting access

-- Drop existing permissive policies that may be allowing too much access
DROP POLICY IF EXISTS "System admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can only view their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can only update their own company" ON public.companies;

-- Create more restrictive policies

-- Admin policy - only true admins can manage all companies
CREATE POLICY "Admins can manage all companies" 
ON public.companies 
FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Users can only view their own company (more restrictive)
CREATE POLICY "Users can view only their own company" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = companies.id
  )
);

-- Users can only update their own company
CREATE POLICY "Users can update only their own company" 
ON public.companies 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = companies.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = companies.id
  )
);

-- Keep the company creation policy as is (it's already restrictive)
-- Users can only create a company if they don't already belong to one

-- Create policy for deletion (only admins or company owners can delete)
CREATE POLICY "Restrict company deletion" 
ON public.companies 
FOR DELETE 
TO authenticated
USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = companies.id 
    AND profiles.role = 'admin'
  )
);

-- Add additional security: Revoke any default permissions
REVOKE ALL ON public.companies FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
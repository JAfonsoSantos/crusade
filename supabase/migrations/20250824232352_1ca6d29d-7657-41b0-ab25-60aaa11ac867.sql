-- Fix security vulnerability in companies table RLS policies
-- Remove overly permissive policies and replace with secure ones

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update their company" ON public.companies;
DROP POLICY IF EXISTS "Users can view companies they have access to" ON public.companies;
DROP POLICY IF EXISTS "tenant_read_companies" ON public.companies;
DROP POLICY IF EXISTS "tenant_write_companies" ON public.companies;

-- Create secure RLS policies - restrict to authenticated users only
CREATE POLICY "Authenticated users can view their own company" 
ON public.companies 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = companies.id
  )
);

CREATE POLICY "Admins can view all companies" 
ON public.companies 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Authenticated users can update their own company" 
ON public.companies 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = companies.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = companies.id
  )
);

CREATE POLICY "Admins can manage all companies" 
ON public.companies 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "System can create companies during signup" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Add policy for deletion (admins only)
CREATE POLICY "Admins can delete companies" 
ON public.companies 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
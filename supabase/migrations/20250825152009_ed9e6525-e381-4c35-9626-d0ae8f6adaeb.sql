-- Complete cleanup of problematic RLS policies

-- Disable RLS temporarily on pipelines to fix the issue
ALTER TABLE public.pipelines DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on pipelines
DROP POLICY IF EXISTS "pipelines_company_access" ON public.pipelines;

-- Disable and re-enable RLS to ensure clean state
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_user_access" ON public.companies;

-- Re-enable RLS and create simple, direct policies
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create very simple pipeline policy using current_company_id function
CREATE POLICY "pipelines_simple_access" 
ON public.pipelines 
FOR ALL
USING (company_id = current_company_id())
WITH CHECK (company_id = current_company_id());

-- Create very simple companies policy
CREATE POLICY "companies_simple_access" 
ON public.companies 
FOR SELECT
USING (
  id = current_company_id() 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_company_access uca 
    WHERE uca.user_id = auth.uid() 
    AND uca.company_id = companies.id
  )
);
-- Fix RLS infinite recursion issues

-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "user_can_read_companies_with_access" ON public.companies;

-- Drop existing policies on pipelines that may cause recursion
DROP POLICY IF EXISTS "Users can manage pipelines for their company" ON public.pipelines;
DROP POLICY IF EXISTS "Users can view pipelines for their company" ON public.pipelines;
DROP POLICY IF EXISTS "tenant_delete_pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "tenant_insert_pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "tenant_read_pipelines" ON public.pipelines;
DROP POLICY IF EXISTS "tenant_update_pipelines" ON public.pipelines;

-- Create simple, non-recursive policies for pipelines
CREATE POLICY "pipelines_company_access" 
ON public.pipelines 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.company_id = pipelines.company_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.company_id = pipelines.company_id
  )
);

-- Create simple policy for companies table 
CREATE POLICY "companies_user_access" 
ON public.companies 
FOR SELECT
USING (
  id IN (
    SELECT DISTINCT p.company_id 
    FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id IS NOT NULL
    
    UNION 
    
    SELECT DISTINCT uca.company_id 
    FROM public.user_company_access uca 
    WHERE uca.user_id = auth.uid()
  )
);
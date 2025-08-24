-- Fix security definer view issue by updating current_company_id function
-- Remove SECURITY DEFINER property to fix the security lint warning

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE -- Removed SECURITY DEFINER
AS $$
  select company_id
  from public.profiles
  where user_id = auth.uid()
  limit 1
$$;
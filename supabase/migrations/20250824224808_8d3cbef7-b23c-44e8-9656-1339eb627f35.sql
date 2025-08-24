-- Fix security definer view issue by removing SECURITY DEFINER from current_company_id function
-- and updating it to be a regular function that relies on RLS policies

DROP FUNCTION IF EXISTS public.current_company_id();

-- Recreate the function without SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  select company_id
  from public.profiles
  where user_id = auth.uid()
  limit 1
$$;
-- Minimal hotfix: make current_company_id security definer to stop recursive RLS and stack depth issues
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  select company_id
  from public.profiles
  where user_id = auth.uid()
  limit 1
$$;
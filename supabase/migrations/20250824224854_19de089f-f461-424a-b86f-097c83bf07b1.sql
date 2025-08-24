-- Fix remaining security definer functions by removing SECURITY DEFINER where safe
-- Note: Some functions like trigger functions need SECURITY DEFINER for proper operation

-- Fix get_current_user_role function (used in RLS policies)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE -- Removed SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;
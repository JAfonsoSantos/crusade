-- Address Security Definer View warnings by ensuring search_path is explicitly set
-- and functions are properly documented as intentionally using SECURITY DEFINER

-- Update functions that legitimately need SECURITY DEFINER but need proper search_path
CREATE OR REPLACE FUNCTION public.refresh_all_materialized()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  perform 1;
  -- Use CONCURRENTLY where possible (requires indexes)
  begin
    execute 'refresh materialized view concurrently public.mv_flight_performance';
  exception when others then
    execute 'refresh materialized view public.mv_flight_performance';
  end;

  begin
    execute 'refresh materialized view concurrently public.mv_campaign_performance';
  exception when others then
    execute 'refresh materialized view public.mv_campaign_performance';
  end;

  begin
    execute 'refresh materialized view concurrently public.mv_campaign_pacing';
  exception when others then
    execute 'refresh materialized view public.mv_campaign_pacing';
  end;

  begin
    execute 'refresh materialized view concurrently public.mv_gantt_items';
  exception when others then
    execute 'refresh materialized view public.mv_gantt_items';
  end;
end
$function$;

-- Update the _drop_policy_if_exists function to set search_path
CREATE OR REPLACE FUNCTION public._drop_policy_if_exists(tbl regclass, pol name)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = split_part(tbl::text, '.', 2)
      and policyname = pol
  ) then
    execute format('drop policy %I on %s', pol, tbl::text);
  end if;
end;
$function$;

-- Update the cleanup function to set search_path
CREATE OR REPLACE FUNCTION public.cleanup_password_reset_attempts()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DELETE FROM public.password_reset_attempts 
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
  SELECT 1;
$function$;

-- Update the prevent_role_escalation function to set search_path
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow admin users to change roles freely
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  
  -- For non-admin users, check if role is being changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Prevent escalation to admin
    IF NEW.role = 'admin' THEN
      RAISE EXCEPTION 'Permission denied: Cannot self-promote to admin role';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the is_admin function to set search_path  
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$function$;

-- Update the user_belongs_to_company function to set search_path
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(company_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND company_id = company_uuid
  );
$function$;

-- Add comments to document why these functions legitimately use SECURITY DEFINER
COMMENT ON FUNCTION public.handle_new_user() IS 'SECURITY DEFINER required: Creates user profiles during auth signup process';
COMMENT ON FUNCTION public.handle_new_user_company() IS 'SECURITY DEFINER required: Creates companies during user signup process';
COMMENT ON FUNCTION public.is_admin() IS 'SECURITY DEFINER required: Safely checks admin status for RLS policies';
COMMENT ON FUNCTION public.user_belongs_to_company(uuid) IS 'SECURITY DEFINER required: Safely validates company membership for RLS policies';
COMMENT ON FUNCTION public.prevent_role_escalation() IS 'SECURITY DEFINER required: Security trigger to prevent unauthorized role escalation';
COMMENT ON FUNCTION public.cleanup_password_reset_attempts() IS 'SECURITY DEFINER required: System maintenance function for password reset cleanup';
COMMENT ON FUNCTION public.refresh_all_materialized() IS 'SECURITY DEFINER required: System function to refresh materialized views';
COMMENT ON FUNCTION public._drop_policy_if_exists(regclass, name) IS 'SECURITY DEFINER required: Utility function for policy management';
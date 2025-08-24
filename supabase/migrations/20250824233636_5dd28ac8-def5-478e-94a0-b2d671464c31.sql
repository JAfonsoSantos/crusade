-- Security fix: Create trigger to prevent role privilege escalation
-- Users should not be able to change their own role to 'admin'

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create trigger to enforce role escalation prevention
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- Add rate limiting table for password reset attempts
CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT FALSE
);

-- Enable RLS on password reset attempts
ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- Only allow system to insert/view password reset attempts
CREATE POLICY "System only password reset tracking" 
ON public.password_reset_attempts 
FOR ALL 
TO authenticated 
USING (FALSE)
WITH CHECK (FALSE);

-- Add index for cleanup efficiency
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_cleanup 
ON public.password_reset_attempts (attempted_at);

-- Function to cleanup old password reset attempts (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_password_reset_attempts()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.password_reset_attempts 
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
  SELECT 1;
$$;
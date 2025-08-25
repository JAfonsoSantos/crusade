-- Create user activity logs table
CREATE TABLE public.user_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  resource_type text,
  resource_id uuid,
  session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_company_id ON public.user_activity_logs(company_id);
CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX idx_user_activity_logs_action ON public.user_activity_logs(action);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - only admins can view logs
CREATE POLICY "Admins can view all activity logs for their company"
ON public.user_activity_logs
FOR SELECT
USING (
  company_id = current_company_id() 
  AND is_admin()
);

-- Create policy for system inserts (no user restrictions for logging)
CREATE POLICY "System can insert activity logs"
ON public.user_activity_logs
FOR INSERT
WITH CHECK (true);

-- Create function to log user activities
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id uuid,
  p_action text,
  p_details jsonb DEFAULT '{}',
  p_resource_type text DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Get user's company_id
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE user_id = p_user_id;

  -- Insert activity log
  INSERT INTO public.user_activity_logs (
    user_id,
    company_id,
    action,
    details,
    resource_type,
    resource_id
  ) VALUES (
    p_user_id,
    v_company_id,
    p_action,
    p_details,
    p_resource_type,
    p_resource_id
  );
END;
$$;
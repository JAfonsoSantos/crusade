-- Enable RLS on _mv_refresh_flags table
ALTER TABLE public._mv_refresh_flags ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow system access (this table is used for materialized view refresh management)
-- Only allow access to authenticated users (system functions)
CREATE POLICY "System access only" ON public._mv_refresh_flags
FOR ALL USING (auth.uid() IS NOT NULL);
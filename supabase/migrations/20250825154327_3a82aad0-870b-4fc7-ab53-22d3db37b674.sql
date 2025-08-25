-- Add permission columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{"pipeline": false, "campaigns": false, "insights": false}'::jsonb;

-- Update existing admin users to have all permissions
UPDATE profiles 
SET permissions = '{"pipeline": true, "campaigns": true, "insights": true}'::jsonb
WHERE role = 'admin';

-- Update existing non-admin users to have campaigns access only
UPDATE profiles 
SET permissions = '{"pipeline": false, "campaigns": true, "insights": false}'::jsonb
WHERE role != 'admin' AND permissions IS NULL;

-- Create access requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  company_id uuid NOT NULL,
  module_name text NOT NULL CHECK (module_name IN ('pipeline', 'campaigns', 'insights')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS on access_requests
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for access_requests
CREATE POLICY "access_requests_company_access" 
ON access_requests 
FOR ALL
USING (company_id = current_company_id())
WITH CHECK (company_id = current_company_id());

-- Add trigger for updated_at
CREATE TRIGGER update_access_requests_updated_at
  BEFORE UPDATE ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
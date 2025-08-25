-- Create test companies for switching
INSERT INTO public.companies (name, email, website, industry, status)
VALUES 
  ('Test Media Corp', 'contact@testmedia.com', 'https://testmedia.com', 'Media & Entertainment', 'active'),
  ('AdTech Solutions', 'hello@adtech.com', 'https://adtech.io', 'Advertising Technology', 'active');

-- Create a many-to-many relationship table for users and companies
CREATE TABLE IF NOT EXISTS public.user_company_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  is_current boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS on the new table
ALTER TABLE public.user_company_access ENABLE ROW LEVEL SECURITY;

-- Create policies for user_company_access
CREATE POLICY "Users can view their company access"
ON public.user_company_access
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their company access"
ON public.user_company_access
FOR UPDATE
USING (auth.uid() = user_id);

-- Insert access records for Afonso Santos to multiple companies
INSERT INTO public.user_company_access (user_id, company_id, role, is_current)
SELECT 
  p.user_id,
  c.id as company_id,
  'user' as role,
  CASE 
    WHEN c.name = (SELECT companies.name FROM companies WHERE companies.id = p.company_id) THEN true 
    ELSE false 
  END as is_current
FROM public.profiles p
CROSS JOIN public.companies c
WHERE p.full_name = 'Afonso Santos' 
  AND c.name IN ('Test Media Corp', 'AdTech Solutions')
ON CONFLICT (user_id, company_id) DO NOTHING;
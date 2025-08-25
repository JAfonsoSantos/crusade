-- Create a test company for switching
INSERT INTO public.companies (name, email, website, industry, status)
VALUES 
  ('Test Media Corp', 'contact@testmedia.com', 'https://testmedia.com', 'Media & Entertainment', 'active'),
  ('AdTech Solutions', 'hello@adtech.com', 'https://adtech.io', 'Advertising Technology', 'active');

-- Create a profiles entry for Afonso Santos with access to Test Media Corp
-- First, let's find Afonso's user_id and create access to the new company
INSERT INTO public.profiles (user_id, company_id, role, full_name)
SELECT 
  p.user_id,
  c.id as company_id,
  'user' as role,
  p.full_name
FROM public.profiles p
CROSS JOIN public.companies c
WHERE p.full_name = 'Afonso Santos' 
  AND c.name IN ('Test Media Corp', 'AdTech Solutions')
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.user_id = p.user_id AND p2.company_id = c.id
  );
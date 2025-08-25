-- Insert Kevel into user_company_access for Afonso Santos and set it as current
INSERT INTO public.user_company_access (user_id, company_id, role, is_current)
SELECT 
  p.user_id,
  p.company_id,
  'user' as role,
  true as is_current
FROM public.profiles p
WHERE p.full_name = 'Afonso Santos'
ON CONFLICT (user_id, company_id) DO UPDATE SET is_current = true;
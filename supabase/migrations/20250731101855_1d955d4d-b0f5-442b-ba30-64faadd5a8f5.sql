-- Fix the security warnings by updating all functions to use proper search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

-- Fix the handle_new_user_company function
CREATE OR REPLACE FUNCTION public.handle_new_user_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_company_id uuid;
BEGIN
  -- Create a new company for the user
  INSERT INTO public.companies (name, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Company') || '''s Company',
    NEW.email
  )
  RETURNING id INTO new_company_id;
  
  -- Update the user's profile with the new company_id
  UPDATE public.profiles 
  SET company_id = new_company_id 
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$$;
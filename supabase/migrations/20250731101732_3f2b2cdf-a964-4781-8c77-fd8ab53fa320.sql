-- Create a trigger to automatically create a company and associate it with new users
CREATE OR REPLACE FUNCTION public.handle_new_user_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger to run after the profile is created
CREATE TRIGGER on_auth_user_company_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_company();
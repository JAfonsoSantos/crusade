-- Create a manual company setup for existing users who don't have companies yet
-- This will create companies for any existing profiles that don't have a company_id

DO $$
DECLARE
    profile_record RECORD;
    new_company_id uuid;
BEGIN
    -- Loop through all profiles that don't have a company_id
    FOR profile_record IN 
        SELECT p.user_id, p.full_name, u.email 
        FROM profiles p
        JOIN auth.users u ON p.user_id = u.id
        WHERE p.company_id IS NULL
    LOOP
        -- Create a company for this user
        INSERT INTO public.companies (name, email)
        VALUES (
            COALESCE(profile_record.full_name, 'My Company') || '''s Company',
            profile_record.email
        )
        RETURNING id INTO new_company_id;
        
        -- Update the user's profile with the new company_id
        UPDATE public.profiles 
        SET company_id = new_company_id 
        WHERE user_id = profile_record.user_id;
        
        RAISE NOTICE 'Created company % for user %', new_company_id, profile_record.user_id;
    END LOOP;
END $$;
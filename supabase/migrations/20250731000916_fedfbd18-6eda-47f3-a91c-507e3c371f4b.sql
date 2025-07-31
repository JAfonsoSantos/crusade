-- Create a default company for existing users who don't have one
INSERT INTO companies (name, email, status)
VALUES ('Minha Empresa', 'admin@minhaempresa.com', 'active');

-- Update the profile to link to the company we just created
UPDATE profiles 
SET company_id = (SELECT id FROM companies WHERE name = 'Minha Empresa' LIMIT 1)
WHERE company_id IS NULL;
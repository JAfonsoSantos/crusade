-- Add policy to allow users to create companies
CREATE POLICY "Users can create companies" 
ON public.companies 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Add policy to allow users to update companies they have access to via profiles
CREATE POLICY "Users can update their company" 
ON public.companies 
FOR UPDATE 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.company_id = companies.id
));
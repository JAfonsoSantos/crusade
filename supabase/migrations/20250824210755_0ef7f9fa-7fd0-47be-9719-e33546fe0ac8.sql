-- Insert some sample advertisers for testing
INSERT INTO public.advertisers (name, company_id) 
SELECT 'Nike', company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.advertisers (name, company_id) 
SELECT 'Adidas', company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.advertisers (name, company_id) 
SELECT 'Coca-Cola', company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
ON CONFLICT DO NOTHING;
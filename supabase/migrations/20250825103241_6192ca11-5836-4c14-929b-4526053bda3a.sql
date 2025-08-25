-- Insert some sample data to test the deals page
-- First, let's ensure we have a pipeline
INSERT INTO public.pipelines (id, name, description, company_id, is_default) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Sales Pipeline', 'Main sales pipeline for deals', (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1), true)
ON CONFLICT DO NOTHING;

-- Insert some sample advertisers
INSERT INTO public.advertisers (id, name, company_id) VALUES 
('660e8400-e29b-41d4-a716-446655440001', 'Apple Inc.', (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)),
('660e8400-e29b-41d4-a716-446655440002', 'Microsoft Corp.', (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1)),
('660e8400-e29b-41d4-a716-446655440003', 'Google LLC', (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1))
ON CONFLICT DO NOTHING;

-- Insert some sample opportunities/deals
INSERT INTO public.opportunities (id, name, amount, stage, probability, close_date, company_id, pipeline_id, advertiser_id, description) VALUES 
('770e8400-e29b-41d4-a716-446655440001', 'Q1 Campaign - Apple iPhone', 150000, 'needs_analysis', 25, '2025-03-31', (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1), '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001', 'Large scale iPhone advertising campaign'),
('770e8400-e29b-41d4-a716-446655440002', 'Microsoft Azure Partnership', 300000, 'proposal', 75, '2025-02-28', (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1), '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440002', 'Strategic partnership for Azure services'),
('770e8400-e29b-41d4-a716-446655440003', 'Google Ads Integration', 50000, 'negotiation', 90, '2025-01-31', (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1), '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440003', 'Integration with Google Ads platform'),
('770e8400-e29b-41d4-a716-446655440004', 'Apple Watch Campaign', 80000, 'value_proposition', 40, '2025-04-15', (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1), '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001', 'Targeted Apple Watch advertising'),
('770e8400-e29b-41d4-a716-446655440005', 'Microsoft Office 365 Promo', 120000, 'closed_won', 100, '2024-12-15', (SELECT company_id FROM profiles WHERE user_id = auth.uid() LIMIT 1), '550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440002', 'Successful Office 365 promotional campaign')
ON CONFLICT DO NOTHING;
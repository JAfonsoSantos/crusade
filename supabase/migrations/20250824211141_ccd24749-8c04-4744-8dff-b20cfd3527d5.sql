-- Create sample campaigns with advertiser relationships
DO $$
DECLARE
    nike_id UUID;
    adidas_id UUID;
    coca_cola_id UUID;
    user_company_id UUID;
BEGIN
    -- Get the company_id for the current user
    SELECT p.company_id INTO user_company_id 
    FROM profiles p 
    WHERE p.user_id = (SELECT auth.uid()) 
    LIMIT 1;
    
    -- Get advertiser IDs
    SELECT id INTO nike_id FROM advertisers WHERE name = 'Nike' AND company_id = user_company_id LIMIT 1;
    SELECT id INTO adidas_id FROM advertisers WHERE name = 'Adidas' AND company_id = user_company_id LIMIT 1;
    SELECT id INTO coca_cola_id FROM advertisers WHERE name = 'Coca-Cola' AND company_id = user_company_id LIMIT 1;
    
    -- Create sample campaigns if they don't exist
    INSERT INTO campaigns (name, description, advertiser_id, company_id, start_date, end_date, budget, status)
    VALUES 
    ('Nike Summer Campaign', 'Summer sports campaign for Nike', nike_id, user_company_id, '2025-06-01', '2025-08-31', 150000, 'active'),
    ('Nike Back to School', 'Back to school promotion', nike_id, user_company_id, '2025-08-15', '2025-09-30', 100000, 'draft'),
    ('Adidas World Cup', 'World Cup sponsorship campaign', adidas_id, user_company_id, '2025-05-01', '2025-07-31', 200000, 'active'),
    ('Coca-Cola Holiday', 'Holiday season campaign', coca_cola_id, user_company_id, '2025-12-01', '2025-12-31', 80000, 'paused')
    ON CONFLICT DO NOTHING;
    
    -- Create sample flights for campaigns
    INSERT INTO flights (name, campaign_id, start_date, end_date, budget, impressions, clicks, conversions, spend, status)
    SELECT 
        'Flight 1', c.id, c.start_date, c.end_date, c.budget * 0.6,
        FLOOR(RANDOM() * 1000000), FLOOR(RANDOM() * 50000), FLOOR(RANDOM() * 2000), FLOOR(RANDOM() * 25000), 'active'
    FROM campaigns c
    WHERE c.company_id = user_company_id
    ON CONFLICT DO NOTHING;
    
    INSERT INTO flights (name, campaign_id, start_date, end_date, budget, impressions, clicks, conversions, spend, status)
    SELECT 
        'Flight 2', c.id, c.start_date, c.end_date, c.budget * 0.4,
        FLOOR(RANDOM() * 800000), FLOOR(RANDOM() * 40000), FLOOR(RANDOM() * 1500), FLOOR(RANDOM() * 20000), 'active'
    FROM campaigns c
    WHERE c.company_id = user_company_id
    ON CONFLICT DO NOTHING;
END $$;
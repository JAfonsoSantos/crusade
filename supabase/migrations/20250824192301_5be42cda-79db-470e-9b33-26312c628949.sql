-- Enable RLS and add policies for advertisers table
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view advertisers for their company" 
ON advertisers 
FOR SELECT 
USING (company_id = current_company_id());

CREATE POLICY "Users can manage advertisers for their company" 
ON advertisers 
FOR ALL 
USING (company_id = current_company_id())
WITH CHECK (company_id = current_company_id());

-- Create fictional opportunities linking to existing campaigns and flights
INSERT INTO opportunities (
  company_id, 
  name, 
  description, 
  amount, 
  stage, 
  probability, 
  close_date, 
  advertiser_id,
  created_by,
  owner_id
) 
SELECT 
  '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7',
  CASE 
    WHEN random() < 0.3 THEN 'Q1 2025 Brand Campaign - ' || a.name
    WHEN random() < 0.6 THEN 'Product Launch Campaign - ' || a.name  
    ELSE 'Seasonal Promotion - ' || a.name
  END,
  'Retail media campaign opportunity for ' || a.name || ' targeting key demographics',
  CASE 
    WHEN random() < 0.2 THEN (random() * 50000 + 10000)::numeric
    WHEN random() < 0.5 THEN (random() * 150000 + 50000)::numeric
    WHEN random() < 0.8 THEN (random() * 300000 + 100000)::numeric
    ELSE (random() * 1000000 + 300000)::numeric
  END,
  CASE 
    WHEN random() < 0.15 THEN 'needs_analysis'
    WHEN random() < 0.35 THEN 'value_proposition'
    WHEN random() < 0.55 THEN 'proposal'
    WHEN random() < 0.75 THEN 'negotiation'
    WHEN random() < 0.85 THEN 'closed_won'
    ELSE 'closed_lost'
  END,
  CASE 
    WHEN random() < 0.2 THEN 25
    WHEN random() < 0.4 THEN 50
    WHEN random() < 0.7 THEN 75
    ELSE 90
  END,
  CURRENT_DATE + (random() * 120)::integer,
  a.id,
  (SELECT user_id FROM profiles WHERE company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7' LIMIT 1),
  (SELECT user_id FROM profiles WHERE company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7' LIMIT 1)
FROM advertisers a 
WHERE a.company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7'
ORDER BY random()
LIMIT 15;
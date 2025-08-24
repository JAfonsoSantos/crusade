-- Create some fictional advertisers to populate the pipeline
INSERT INTO advertisers (company_id, name, source) VALUES 
  ('4f9ab393-fd74-4c1d-bac8-3a1f7add13c7', 'Nike', 'manual'),
  ('4f9ab393-fd74-4c1d-bac8-3a1f7add13c7', 'Adidas', 'manual'),
  ('4f9ab393-fd74-4c1d-bac8-3a1f7add13c7', 'Samsung', 'manual'),
  ('4f9ab393-fd74-4c1d-bac8-3a1f7add13c7', 'Apple', 'manual'),
  ('4f9ab393-fd74-4c1d-bac8-3a1f7add13c7', 'Coca-Cola', 'manual'),
  ('4f9ab393-fd74-4c1d-bac8-3a1f7add13c7', 'McDonald''s', 'manual'),
  ('4f9ab393-fd74-4c1d-bac8-3a1f7add13c7', 'BMW', 'manual'),
  ('4f9ab393-fd74-4c1d-bac8-3a1f7add13c7', 'Netflix', 'manual'),
  ('4f9ab393-fd74-4c1d-bac8-3a1f7add13c7', 'Amazon', 'manual'),
  ('4f9ab393-fd74-4c1d-bac8-3a1f7add13c7', 'Google', 'manual');

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

-- Add columns to opportunities to link to campaigns and flights
ALTER TABLE opportunities ADD COLUMN campaign_id uuid REFERENCES campaigns(id);
ALTER TABLE opportunities ADD COLUMN flight_id uuid REFERENCES flights(id);

-- Update opportunities to link them to existing campaigns and flights
WITH random_campaigns AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY random()) as rn
  FROM campaigns 
  WHERE company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7'
),
random_flights AS (
  SELECT f.id, f.campaign_id, ROW_NUMBER() OVER (ORDER BY random()) as rn
  FROM flights f
  JOIN campaigns c ON c.id = f.campaign_id
  WHERE c.company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7'
)
UPDATE opportunities 
SET 
  campaign_id = rc.id,
  flight_id = rf.id
FROM (
  SELECT 
    o.id as opp_id,
    rc.id as campaign_id,
    rf.id as flight_id
  FROM opportunities o
  JOIN random_campaigns rc ON rc.rn = ((ROW_NUMBER() OVER (ORDER BY o.created_at) - 1) % (SELECT COUNT(*) FROM random_campaigns)) + 1
  JOIN random_flights rf ON rf.campaign_id = rc.id AND rf.rn = 1
  WHERE o.company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7'
) AS matched ON matched.opp_id = opportunities.id;

-- Create some activity records for opportunities
INSERT INTO opportunity_activities (
  opportunity_id,
  activity_type,
  description,
  created_by
)
SELECT 
  o.id,
  CASE 
    WHEN random() < 0.3 THEN 'call'
    WHEN random() < 0.6 THEN 'email'
    WHEN random() < 0.8 THEN 'meeting'
    ELSE 'note'
  END,
  CASE 
    WHEN random() < 0.25 THEN 'Initial discovery call - discussed campaign objectives and budget'
    WHEN random() < 0.5 THEN 'Sent proposal with recommended ad placements and pricing'
    WHEN random() < 0.75 THEN 'Follow-up meeting to review campaign performance metrics'
    ELSE 'Internal note: Customer very interested, expecting decision next week'
  END,
  o.created_by
FROM opportunities o
WHERE o.company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7'
ORDER BY random()
LIMIT 25;
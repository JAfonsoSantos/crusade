-- Create some opportunities for the new pipelines
INSERT INTO opportunities (
  company_id, 
  pipeline_id,
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
  p.id,
  CASE 
    WHEN p.name = 'Enterprise Deals' THEN 'Enterprise Campaign - ' || adv.name
    WHEN p.name = 'SMB Pipeline' THEN 'SMB Campaign - ' || adv.name
    ELSE 'Partnership - ' || adv.name
  END,
  'Sample opportunity for ' || p.name,
  CASE 
    WHEN p.name = 'Enterprise Deals' THEN (random() * 2000000 + 500000)::numeric
    WHEN p.name = 'SMB Pipeline' THEN (random() * 100000 + 20000)::numeric
    ELSE (random() * 500000 + 100000)::numeric
  END,
  CASE 
    WHEN random() < 0.2 THEN 'needs_analysis'
    WHEN random() < 0.4 THEN 'value_proposition'
    WHEN random() < 0.6 THEN 'proposal'
    WHEN random() < 0.8 THEN 'negotiation'
    ELSE 'closed_won'
  END,
  (random() * 50 + 25)::integer,
  CURRENT_DATE + (random() * 90)::integer,
  adv.id,
  (SELECT user_id FROM profiles WHERE company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7' LIMIT 1),
  (SELECT user_id FROM profiles WHERE company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7' LIMIT 1)
FROM pipelines p
CROSS JOIN (SELECT id, name FROM advertisers WHERE company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7' ORDER BY random() LIMIT 3) adv
WHERE p.company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7' 
  AND p.name != 'Sales Pipeline'
ORDER BY random()
LIMIT 9;
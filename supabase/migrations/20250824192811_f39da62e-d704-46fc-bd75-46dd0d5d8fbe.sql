-- Create pipelines table for multiple sales pipelines
CREATE TABLE pipelines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  description text,
  source text DEFAULT 'manual', -- manual, salesforce, hubspot, pipedrive, etc
  external_id text, -- for future CRM integrations
  stages jsonb DEFAULT '[
    {"key": "needs_analysis", "label": "Needs Analysis", "color": "bg-blue-500", "order": 1},
    {"key": "value_proposition", "label": "Value Proposition", "color": "bg-purple-500", "order": 2},
    {"key": "proposal", "label": "Proposal/Quote", "color": "bg-orange-500", "order": 3},
    {"key": "negotiation", "label": "Negotiation/Review", "color": "bg-yellow-500", "order": 4},
    {"key": "closed_won", "label": "Closed Won", "color": "bg-green-500", "order": 5},
    {"key": "closed_lost", "label": "Closed Lost", "color": "bg-red-500", "order": 6}
  ]'::jsonb,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

-- Create policies for pipelines
CREATE POLICY "Users can view pipelines for their company" 
ON pipelines 
FOR SELECT 
USING (company_id = current_company_id());

CREATE POLICY "Users can manage pipelines for their company" 
ON pipelines 
FOR ALL 
USING (company_id = current_company_id())
WITH CHECK (company_id = current_company_id());

-- Add pipeline_id to opportunities table
ALTER TABLE opportunities ADD COLUMN pipeline_id uuid REFERENCES pipelines(id);

-- Create a default pipeline for existing data
INSERT INTO pipelines (company_id, name, description, is_default, created_by)
SELECT DISTINCT 
  company_id,
  'Sales Pipeline',
  'Default sales pipeline for retail media opportunities',
  true,
  (SELECT user_id FROM profiles WHERE company_id = opportunities.company_id LIMIT 1)
FROM opportunities 
WHERE company_id IS NOT NULL;

-- Update existing opportunities to use the default pipeline
UPDATE opportunities 
SET pipeline_id = (
  SELECT p.id 
  FROM pipelines p 
  WHERE p.company_id = opportunities.company_id 
    AND p.is_default = true 
  LIMIT 1
)
WHERE pipeline_id IS NULL;

-- Create some additional sample pipelines
INSERT INTO pipelines (company_id, name, description, created_by) VALUES 
(
  '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7',
  'Enterprise Deals',
  'Large enterprise accounts with complex sales cycles',
  (SELECT user_id FROM profiles WHERE company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7' LIMIT 1)
),
(
  '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7',
  'SMB Pipeline',
  'Small and medium business opportunities',
  (SELECT user_id FROM profiles WHERE company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7' LIMIT 1)
),
(
  '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7',
  'Agency Partnerships',
  'Media agency partnership opportunities',
  (SELECT user_id FROM profiles WHERE company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7' LIMIT 1)
);

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
    WHEN p.name = 'Enterprise Deals' THEN 'Enterprise Campaign - ' || a.name
    WHEN p.name = 'SMB Pipeline' THEN 'SMB Campaign - ' || a.name
    ELSE 'Partnership - ' || a.name
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
  a.id,
  (SELECT user_id FROM profiles WHERE company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7' LIMIT 1),
  (SELECT user_id FROM profiles WHERE company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7' LIMIT 1)
FROM pipelines p
CROSS JOIN (SELECT id FROM advertisers WHERE company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7' ORDER BY random() LIMIT 3) a
WHERE p.company_id = '4f9ab393-fd74-4c1d-bac8-3a1f7add13c7' 
  AND p.name != 'Sales Pipeline'
ORDER BY random()
LIMIT 9;
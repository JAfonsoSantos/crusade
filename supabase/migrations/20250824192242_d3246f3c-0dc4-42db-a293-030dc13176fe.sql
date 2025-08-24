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

-- Add columns to opportunities to link to campaigns and flights
ALTER TABLE opportunities ADD COLUMN campaign_id uuid REFERENCES campaigns(id);
ALTER TABLE opportunities ADD COLUMN flight_id uuid REFERENCES flights(id);
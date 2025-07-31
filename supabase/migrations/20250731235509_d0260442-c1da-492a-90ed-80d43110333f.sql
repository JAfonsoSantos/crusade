-- Create flights table for campaign hierarchy
CREATE TABLE public.flights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget NUMERIC,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'draft',
  priority INTEGER DEFAULT 1,
  targeting_criteria JSONB DEFAULT '{}',
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  external_id TEXT,
  ad_server TEXT DEFAULT 'kevel',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;

-- Create policies for flights
CREATE POLICY "Users can view flights for their company campaigns" 
ON public.flights 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM campaigns c
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE c.id = flights.campaign_id 
  AND (p.company_id = c.company_id OR p.role = 'admin')
));

CREATE POLICY "Users can manage flights for their company campaigns" 
ON public.flights 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM campaigns c
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE c.id = flights.campaign_id 
  AND (p.company_id = c.company_id OR p.role = 'admin')
));

-- Update campaign_ad_spaces to reference flights instead of campaigns
ALTER TABLE public.campaign_ad_spaces 
ADD COLUMN flight_id UUID;

-- Add foreign key constraint for flight_id
ALTER TABLE public.campaign_ad_spaces 
ADD CONSTRAINT fk_campaign_ad_spaces_flight 
FOREIGN KEY (flight_id) REFERENCES public.flights(id) ON DELETE CASCADE;

-- Create updated RLS policies for campaign_ad_spaces to work with flights
DROP POLICY IF EXISTS "Users can view campaign ad spaces for their company" ON public.campaign_ad_spaces;
DROP POLICY IF EXISTS "Users can manage campaign ad spaces for their company" ON public.campaign_ad_spaces;

CREATE POLICY "Users can view campaign ad spaces for their company via flights" 
ON public.campaign_ad_spaces 
FOR SELECT 
USING (
  -- Allow if campaign_id matches (legacy)
  (campaign_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM campaigns c
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE c.id = campaign_ad_spaces.campaign_id 
    AND (p.company_id = c.company_id OR p.role = 'admin')
  ))
  OR
  -- Allow if flight_id matches (new structure)
  (flight_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM flights f
    JOIN campaigns c ON c.id = f.campaign_id
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE f.id = campaign_ad_spaces.flight_id 
    AND (p.company_id = c.company_id OR p.role = 'admin')
  ))
);

CREATE POLICY "Users can manage campaign ad spaces for their company via flights" 
ON public.campaign_ad_spaces 
FOR ALL 
USING (
  -- Allow if campaign_id matches (legacy)
  (campaign_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM campaigns c
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE c.id = campaign_ad_spaces.campaign_id 
    AND (p.company_id = c.company_id OR p.role = 'admin')
  ))
  OR
  -- Allow if flight_id matches (new structure)
  (flight_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM flights f
    JOIN campaigns c ON c.id = f.campaign_id
    JOIN profiles p ON p.user_id = auth.uid()
    WHERE f.id = campaign_ad_spaces.flight_id 
    AND (p.company_id = c.company_id OR p.role = 'admin')
  ))
);

-- Add trigger for updated_at
CREATE TRIGGER update_flights_updated_at
BEFORE UPDATE ON public.flights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_flights_campaign_id ON public.flights(campaign_id);
CREATE INDEX idx_flights_status ON public.flights(status);
CREATE INDEX idx_campaign_ad_spaces_flight_id ON public.campaign_ad_spaces(flight_id);
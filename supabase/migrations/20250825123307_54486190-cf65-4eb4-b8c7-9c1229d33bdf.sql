-- Add integration type column to distinguish between different integration categories
ALTER TABLE public.ad_server_integrations 
ADD COLUMN integration_type TEXT NOT NULL DEFAULT 'ad_server';

-- Add check constraint for valid integration types
ALTER TABLE public.ad_server_integrations 
ADD CONSTRAINT valid_integration_type 
CHECK (integration_type IN ('ad_server', 'crm', 'analytics', 'email', 'automation'));

-- Update existing records to have the correct type
UPDATE public.ad_server_integrations 
SET integration_type = 'ad_server' 
WHERE provider IN ('kevel', 'koddi', 'topsort', 'google_ad_manager', 'criteo', 'citrusad', 'moloko');

-- Add index for better performance
CREATE INDEX idx_integrations_type ON public.ad_server_integrations(integration_type);
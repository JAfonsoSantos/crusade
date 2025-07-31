-- Create a flexible campaign structure table that supports multiple ad platforms
CREATE TABLE public.platform_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.ad_server_integrations(id) ON DELETE CASCADE,
  local_entity_type TEXT NOT NULL, -- 'campaign', 'ad_space', 'ad_group', etc.
  local_entity_id UUID NOT NULL,
  platform_entity_type TEXT NOT NULL, -- 'campaign', 'flight', 'ad_group', 'line_item', etc.
  platform_entity_id TEXT NOT NULL,
  platform_parent_type TEXT,
  platform_parent_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(integration_id, local_entity_type, local_entity_id, platform_entity_type)
);

-- Enable RLS
ALTER TABLE public.platform_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage platform mappings for their company"
ON public.platform_mappings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.ad_server_integrations asi
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE asi.id = platform_mappings.integration_id
    AND (p.company_id = asi.company_id OR p.role = 'admin')
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_platform_mappings_updated_at
  BEFORE UPDATE ON public.platform_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Extend ad_server_integrations to support multiple providers
ALTER TABLE public.ad_server_integrations 
ADD COLUMN IF NOT EXISTS platform_config JSONB DEFAULT '{}';

-- Add comment for platform_config
COMMENT ON COLUMN public.ad_server_integrations.platform_config IS 'Platform-specific configuration and hierarchy mappings';
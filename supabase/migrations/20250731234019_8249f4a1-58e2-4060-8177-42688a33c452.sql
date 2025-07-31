-- Add ad server and usage tracking columns to ad_spaces table
ALTER TABLE public.ad_spaces 
ADD COLUMN ad_server TEXT DEFAULT 'kevel',
ADD COLUMN external_id TEXT, -- Kevel site/ad unit ID
ADD COLUMN impressions BIGINT DEFAULT 0,
ADD COLUMN clicks BIGINT DEFAULT 0,
ADD COLUMN last_impression TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_click TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_active BOOLEAN DEFAULT true,
ADD COLUMN usage_status TEXT DEFAULT 'unused' CHECK (usage_status IN ('active', 'past_used', 'unused'));

-- Create index for better performance
CREATE INDEX idx_ad_spaces_ad_server ON public.ad_spaces(ad_server);
CREATE INDEX idx_ad_spaces_usage_status ON public.ad_spaces(usage_status);
CREATE INDEX idx_ad_spaces_external_id ON public.ad_spaces(external_id);

-- Add trigger to automatically update usage_status based on activity
CREATE OR REPLACE FUNCTION update_ad_space_usage_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If there are recent impressions (within 7 days), mark as active
  IF NEW.last_impression IS NOT NULL AND NEW.last_impression > (NOW() - INTERVAL '7 days') THEN
    NEW.usage_status = 'active';
  -- If there are older impressions, mark as past_used
  ELSIF NEW.last_impression IS NOT NULL OR NEW.impressions > 0 THEN
    NEW.usage_status = 'past_used';
  -- Otherwise, mark as unused
  ELSE
    NEW.usage_status = 'unused';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ad_space_usage_status
  BEFORE INSERT OR UPDATE ON public.ad_spaces
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_space_usage_status();
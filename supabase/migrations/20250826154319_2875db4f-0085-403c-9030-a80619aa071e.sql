-- Add missing columns to campaigns table that are required for Kevel sync
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ad_server TEXT DEFAULT 'kevel';

-- Create index for better performance on external_id lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_external_id ON campaigns(external_id) WHERE external_id IS NOT NULL;
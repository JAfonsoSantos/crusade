-- Check current status constraint and update to allow 'paused'
ALTER TABLE ad_server_integrations 
DROP CONSTRAINT IF EXISTS ad_server_integrations_status_check;

ALTER TABLE ad_server_integrations 
ADD CONSTRAINT ad_server_integrations_status_check 
CHECK (status IN ('active', 'inactive', 'paused', 'error'));
-- Reset the integration status to active so it can sync again
UPDATE ad_server_integrations 
SET status = 'active', last_sync = now()
WHERE id = '34e14b5a-3f97-4e69-ae70-f732e46d7c26' AND status = 'error';
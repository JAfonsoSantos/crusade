-- Enable pg_cron and pg_net extensions for scheduled functions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to run auto-sync every hour
SELECT cron.schedule(
  'auto-sync-kevel-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://bzqjxkmkrzvsigimnwwc.supabase.co/functions/v1/auto-sync-kevel',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6cWp4a21rcnp2c2lnaW1ud3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MTA1OTEsImV4cCI6MjA2OTQ4NjU5MX0.Qc3ANgy2S4TpnV8FjGTZ0cDw_bI837iIt4fXYqmPxXU"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);
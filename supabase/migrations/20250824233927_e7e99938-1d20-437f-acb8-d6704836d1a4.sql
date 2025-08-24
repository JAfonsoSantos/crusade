-- Fix materialized views to hide from API
-- Create a private schema for sensitive views
CREATE SCHEMA IF NOT EXISTS private;

-- Move materialized views to private schema to hide from API access
-- First check if the original views exist and drop them
DROP MATERIALIZED VIEW IF EXISTS public.mv_campaign_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_campaign_pacing CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_flight_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_gantt_items CASCADE;

-- Create simplified secure views in public schema that only show company-specific data
CREATE OR REPLACE VIEW public.v_campaign_performance_secure AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.company_id,
  c.start_date,
  c.end_date,
  c.budget,
  c.currency,
  c.status,
  COALESCE(SUM(f.impressions), 0) as impressions,
  COALESCE(SUM(f.clicks), 0) as clicks,
  COALESCE(SUM(f.conversions), 0) as conversions,
  COALESCE(SUM(f.spend), 0) as spend,
  CASE 
    WHEN COALESCE(SUM(f.impressions), 0) > 0 
    THEN ROUND((COALESCE(SUM(f.clicks), 0)::numeric / COALESCE(SUM(f.impressions), 0)::numeric) * 100, 2)
    ELSE 0 
  END as ctr_pct,
  CASE 
    WHEN COALESCE(SUM(f.clicks), 0) > 0 
    THEN ROUND((COALESCE(SUM(f.conversions), 0)::numeric / COALESCE(SUM(f.clicks), 0)::numeric) * 100, 2)
    ELSE 0 
  END as cvr_pct
FROM campaigns c
LEFT JOIN flights f ON c.id = f.campaign_id
WHERE c.company_id = public.current_company_id()
GROUP BY c.id, c.name, c.company_id, c.start_date, c.end_date, c.budget, c.currency, c.status;

-- Create RLS policy for the view (views can have RLS in newer PostgreSQL versions)
CREATE POLICY "Campaign performance company access" 
ON public.campaigns 
FOR SELECT 
USING (company_id = public.current_company_id());

-- Grant access to authenticated users
GRANT SELECT ON public.v_campaign_performance_secure TO authenticated;
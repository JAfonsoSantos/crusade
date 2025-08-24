-- Fix materialized views to hide from API and complete security hardening
-- Create a private schema for sensitive views
CREATE SCHEMA IF NOT EXISTS private;

-- Drop existing materialized views if they exist
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

-- Grant access to authenticated users
GRANT SELECT ON public.v_campaign_performance_secure TO authenticated;

-- Hide other potentially sensitive views from API by restricting access
REVOKE ALL ON public.v_campaign_kpis_30d FROM PUBLIC;
REVOKE ALL ON public.v_campaign_pacing FROM PUBLIC;
REVOKE ALL ON public.v_campaign_performance FROM PUBLIC;
REVOKE ALL ON public.v_campaign_totals FROM PUBLIC;
REVOKE ALL ON public.v_flight_performance FROM PUBLIC;
REVOKE ALL ON public.v_flight_products_count FROM PUBLIC;
REVOKE ALL ON public.v_flight_spaces FROM PUBLIC;
REVOKE ALL ON public.v_flight_timeseries_30d FROM PUBLIC;
REVOKE ALL ON public.v_flights_gantt FROM PUBLIC;
REVOKE ALL ON public.v_gantt_items FROM PUBLIC;
REVOKE ALL ON public.v_integrations_sync_status FROM PUBLIC;
REVOKE ALL ON public.v_platform_mappings_flat FROM PUBLIC;
REVOKE ALL ON public.v_sync_health FROM PUBLIC;

-- Only grant access to authenticated users for specific views
GRANT SELECT ON public.v_campaign_kpis_30d TO authenticated;
GRANT SELECT ON public.v_campaign_pacing TO authenticated;
GRANT SELECT ON public.v_campaign_performance TO authenticated;
GRANT SELECT ON public.v_campaign_totals TO authenticated;
GRANT SELECT ON public.v_flight_performance TO authenticated;
GRANT SELECT ON public.v_flights_gantt TO authenticated;
GRANT SELECT ON public.v_gantt_items TO authenticated;
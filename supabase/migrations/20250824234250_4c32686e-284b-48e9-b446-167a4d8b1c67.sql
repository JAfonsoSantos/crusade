-- Security hardening: Restrict view access to authenticated users only
-- Only modify views that actually exist

-- Grant proper access to existing views for authenticated users only
DO $$
BEGIN
    -- Check if each view exists before granting permissions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v_campaign_kpis_30d') THEN
        REVOKE ALL ON public.v_campaign_kpis_30d FROM PUBLIC;
        GRANT SELECT ON public.v_campaign_kpis_30d TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v_campaign_performance') THEN
        REVOKE ALL ON public.v_campaign_performance FROM PUBLIC;
        GRANT SELECT ON public.v_campaign_performance TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v_campaign_totals') THEN
        REVOKE ALL ON public.v_campaign_totals FROM PUBLIC;
        GRANT SELECT ON public.v_campaign_totals TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v_flight_performance') THEN
        REVOKE ALL ON public.v_flight_performance FROM PUBLIC;
        GRANT SELECT ON public.v_flight_performance TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v_flights_gantt') THEN
        REVOKE ALL ON public.v_flights_gantt FROM PUBLIC;
        GRANT SELECT ON public.v_flights_gantt TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v_gantt_items') THEN
        REVOKE ALL ON public.v_gantt_items FROM PUBLIC;
        GRANT SELECT ON public.v_gantt_items TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'v_platform_mappings_flat') THEN
        REVOKE ALL ON public.v_platform_mappings_flat FROM PUBLIC;
        GRANT SELECT ON public.v_platform_mappings_flat TO authenticated;
    END IF;
END $$;
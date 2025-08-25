-- Complete fix for all RLS recursion issues

-- Check and fix opportunities table policies
DROP POLICY IF EXISTS "Users can manage opportunities for their company" ON public.opportunities;

CREATE POLICY "opportunities_simple_access" 
ON public.opportunities 
FOR ALL
USING (company_id = current_company_id())
WITH CHECK (company_id = current_company_id());

-- Check and fix campaigns table policies  
DROP POLICY IF EXISTS "Users can manage campaigns for their company" ON public.campaigns;
DROP POLICY IF EXISTS "Users can view campaigns for their company" ON public.campaigns;
DROP POLICY IF EXISTS "Campaign performance company access" ON public.campaigns;
DROP POLICY IF EXISTS "tenant_delete_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "tenant_insert_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "tenant_read_campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "tenant_update_campaigns" ON public.campaigns;

CREATE POLICY "campaigns_simple_access" 
ON public.campaigns 
FOR ALL
USING (company_id = current_company_id())
WITH CHECK (company_id = current_company_id());

-- Check and fix flights table policies
DROP POLICY IF EXISTS "Users can manage flights for their company campaigns" ON public.flights;
DROP POLICY IF EXISTS "Users can view flights for their company campaigns" ON public.flights;
DROP POLICY IF EXISTS "tenant_delete_flights" ON public.flights;
DROP POLICY IF EXISTS "tenant_insert_flights" ON public.flights;
DROP POLICY IF EXISTS "tenant_read_flights" ON public.flights;
DROP POLICY IF EXISTS "tenant_update_flights" ON public.flights;

CREATE POLICY "flights_simple_access" 
ON public.flights 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = flights.campaign_id 
    AND c.company_id = current_company_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = flights.campaign_id 
    AND c.company_id = current_company_id()
  )
);

-- Fix advertisers table
DROP POLICY IF EXISTS "Users can manage advertisers for their company" ON public.advertisers;
DROP POLICY IF EXISTS "Users can view advertisers for their company" ON public.advertisers;

CREATE POLICY "advertisers_simple_access" 
ON public.advertisers 
FOR ALL
USING (company_id = current_company_id())
WITH CHECK (company_id = current_company_id());
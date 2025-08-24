-- Enable RLS on tables that are missing it
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for creatives
CREATE POLICY "Users can manage creatives for their company flights" 
ON public.creatives 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM flights f 
  JOIN campaigns c ON f.campaign_id = c.id 
  WHERE f.id = creatives.flight_id 
  AND c.company_id = current_company_id()
));

-- Add RLS policies for flight_products
CREATE POLICY "Users can manage flight products for their company flights" 
ON public.flight_products 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM flights f 
  JOIN campaigns c ON f.campaign_id = c.id 
  WHERE f.id = flight_products.flight_id 
  AND c.company_id = current_company_id()
));

-- Add RLS policies for metrics_daily
CREATE POLICY "Users can view metrics for their company" 
ON public.metrics_daily 
FOR SELECT 
USING (company_id = current_company_id());

-- Add RLS policies for product_catalog
CREATE POLICY "Users can manage products for their company" 
ON public.product_catalog 
FOR ALL 
USING (company_id = current_company_id());

-- Add RLS policies for sync_jobs
CREATE POLICY "Users can view sync jobs for their company" 
ON public.sync_jobs 
FOR ALL 
USING (company_id = current_company_id());
-- Create brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  logo_url TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Create policies for brands
CREATE POLICY "Users can manage brands for their company" 
ON public.brands 
FOR ALL 
USING (company_id = current_company_id())
WITH CHECK (company_id = current_company_id());

-- Add brand_id to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;

-- Create trigger for automatic timestamp updates on brands
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_brands_advertiser_id ON public.brands(advertiser_id);
CREATE INDEX idx_brands_company_id ON public.brands(company_id);
CREATE INDEX idx_campaigns_brand_id ON public.campaigns(brand_id);
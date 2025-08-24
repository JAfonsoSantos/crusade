-- Add advertiser_id column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN advertiser_id UUID REFERENCES public.advertisers(id);

-- Create index for better performance
CREATE INDEX idx_campaigns_advertiser_id ON public.campaigns(advertiser_id);
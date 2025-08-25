-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  job_title TEXT,
  company_name TEXT,
  website TEXT,
  linkedin_url TEXT,
  notes TEXT,
  lead_source TEXT,
  status TEXT DEFAULT 'active',
  advertiser_id UUID REFERENCES public.advertisers(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage contacts for their company" 
ON public.contacts 
FOR ALL 
USING (company_id = current_company_id())
WITH CHECK (company_id = current_company_id());

-- Create trigger for timestamps
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_advertiser_id ON public.contacts(advertiser_id);
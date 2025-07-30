-- Create companies table (your clients)
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  website TEXT,
  industry TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ad_spaces table (advertising inventory)
CREATE TABLE public.ad_spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('banner', 'video', 'native', 'search', 'display')),
  size TEXT, -- e.g. "300x250", "728x90"
  location TEXT, -- website section, app screen, etc.
  price_model TEXT DEFAULT 'cpm' CHECK (price_model IN ('cpm', 'cpc', 'cpa', 'fixed')),
  base_price DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'booked', 'unavailable')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ad_server_integrations table
CREATE TABLE public.ad_server_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'kevel', 'topsort', 'criteo', 'koddi', 'moloko')),
  name TEXT NOT NULL, -- custom name for this integration
  api_key_encrypted TEXT, -- encrypted API key
  configuration JSONB, -- provider-specific settings
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_ad_spaces junction table (many-to-many)
CREATE TABLE public.campaign_ad_spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  ad_space_id UUID NOT NULL REFERENCES public.ad_spaces(id) ON DELETE CASCADE,
  allocated_budget DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, ad_space_id)
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_server_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_ad_spaces ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for companies
CREATE POLICY "Users can view companies they have access to" 
ON public.companies 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (profiles.company_id = companies.id OR profiles.role = 'admin')
  )
);

CREATE POLICY "Admins can manage all companies" 
ON public.companies 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Create RLS policies for ad_spaces
CREATE POLICY "Users can view ad_spaces for their company" 
ON public.ad_spaces 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (profiles.company_id = ad_spaces.company_id OR profiles.role = 'admin')
  )
);

CREATE POLICY "Users can manage ad_spaces for their company" 
ON public.ad_spaces 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (profiles.company_id = ad_spaces.company_id OR profiles.role = 'admin')
  )
);

-- Create RLS policies for campaigns
CREATE POLICY "Users can view campaigns for their company" 
ON public.campaigns 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (profiles.company_id = campaigns.company_id OR profiles.role = 'admin')
  )
);

CREATE POLICY "Users can manage campaigns for their company" 
ON public.campaigns 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (profiles.company_id = campaigns.company_id OR profiles.role = 'admin')
  )
);

-- Create RLS policies for ad_server_integrations
CREATE POLICY "Users can view integrations for their company" 
ON public.ad_server_integrations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (profiles.company_id = ad_server_integrations.company_id OR profiles.role = 'admin')
  )
);

CREATE POLICY "Users can manage integrations for their company" 
ON public.ad_server_integrations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND (profiles.company_id = ad_server_integrations.company_id OR profiles.role = 'admin')
  )
);

-- Create RLS policies for campaign_ad_spaces
CREATE POLICY "Users can view campaign ad spaces for their company" 
ON public.campaign_ad_spaces 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE c.id = campaign_ad_spaces.campaign_id 
    AND (p.company_id = c.company_id OR p.role = 'admin')
  )
);

CREATE POLICY "Users can manage campaign ad spaces for their company" 
ON public.campaign_ad_spaces 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE c.id = campaign_ad_spaces.campaign_id 
    AND (p.company_id = c.company_id OR p.role = 'admin')
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_spaces_updated_at
  BEFORE UPDATE ON public.ad_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_server_integrations_updated_at
  BEFORE UPDATE ON public.ad_server_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX idx_ad_spaces_company_id ON public.ad_spaces(company_id);
CREATE INDEX idx_campaigns_company_id ON public.campaigns(company_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaign_ad_spaces_campaign_id ON public.campaign_ad_spaces(campaign_id);
CREATE INDEX idx_campaign_ad_spaces_ad_space_id ON public.campaign_ad_spaces(ad_space_id);
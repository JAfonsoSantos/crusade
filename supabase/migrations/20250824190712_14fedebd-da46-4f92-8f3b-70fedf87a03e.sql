-- Create opportunities table for CRM pipeline
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  advertiser_id UUID REFERENCES public.advertisers(id),
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'EUR',
  stage TEXT NOT NULL DEFAULT 'needs_analysis',
  probability INTEGER DEFAULT 50,
  close_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  owner_id UUID,
  source TEXT,
  next_steps TEXT,
  last_activity_date TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_stage CHECK (stage IN ('needs_analysis', 'value_proposition', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  CONSTRAINT valid_probability CHECK (probability >= 0 AND probability <= 100)
);

-- Enable RLS
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage opportunities for their company"
ON public.opportunities FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND (profiles.company_id = opportunities.company_id OR profiles.role = 'admin')
));

-- Create index for performance
CREATE INDEX idx_opportunities_company_stage ON public.opportunities(company_id, stage);
CREATE INDEX idx_opportunities_close_date ON public.opportunities(close_date);

-- Create trigger for updated_at
CREATE TRIGGER update_opportunities_updated_at
BEFORE UPDATE ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create activities table for tracking pipeline activities
CREATE TABLE public.opportunity_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  
  CONSTRAINT valid_activity_type CHECK (activity_type IN ('email', 'call', 'meeting', 'proposal_sent', 'stage_change', 'note'))
);

-- Enable RLS on activities
ALTER TABLE public.opportunity_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage activities for their company opportunities"
ON public.opportunity_activities FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.opportunities o
  JOIN profiles p ON p.user_id = auth.uid()
  WHERE o.id = opportunity_activities.opportunity_id 
  AND (p.company_id = o.company_id OR p.role = 'admin')
));
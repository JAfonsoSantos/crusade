-- Create a table to store sync history
CREATE TABLE public.integration_sync_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.ad_server_integrations(id) ON DELETE CASCADE,
  sync_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed',
  synced_count INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  operations JSONB DEFAULT '{}',
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integration_sync_history ENABLE ROW LEVEL SECURITY;

-- Create policies for sync history
CREATE POLICY "Users can view sync history for their company integrations" 
ON public.integration_sync_history 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.ad_server_integrations asi
  JOIN public.profiles p ON p.user_id = auth.uid()
  WHERE asi.id = integration_sync_history.integration_id 
  AND (p.company_id = asi.company_id OR p.role = 'admin')
));

-- Add index for performance
CREATE INDEX idx_integration_sync_history_integration_id ON public.integration_sync_history(integration_id);
CREATE INDEX idx_integration_sync_history_timestamp ON public.integration_sync_history(sync_timestamp DESC);
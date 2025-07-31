-- Make created_by nullable for synced campaigns
ALTER TABLE public.campaigns 
ALTER COLUMN created_by DROP NOT NULL;
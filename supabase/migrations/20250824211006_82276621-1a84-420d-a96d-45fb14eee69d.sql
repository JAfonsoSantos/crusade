-- Ensure FK so PostgREST can embed flights under campaigns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'flights' AND c.conname = 'flights_campaign_id_fkey'
  ) THEN
    ALTER TABLE public.flights
      ADD CONSTRAINT flights_campaign_id_fkey
      FOREIGN KEY (campaign_id)
      REFERENCES public.campaigns(id)
      ON DELETE CASCADE;
  END IF;
END $$;
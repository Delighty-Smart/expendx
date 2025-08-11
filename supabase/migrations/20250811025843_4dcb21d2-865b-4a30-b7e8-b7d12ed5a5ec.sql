-- Add hour_bucket generated column to help deduplicate alerts within the same hour
ALTER TABLE public.alerts
ADD COLUMN IF NOT EXISTS hour_bucket timestamptz
GENERATED ALWAYS AS (
  date_trunc('hour', coalesce(created_at, now()))
) STORED;

-- Clean up existing duplicates before adding unique index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ux_alerts_dedupe'
  ) THEN
    WITH ranked AS (
      SELECT id,
             row_number() OVER (
               PARTITION BY user_id, type, message, date_trunc('hour', coalesce(created_at, now()))
               ORDER BY coalesce(created_at, now()) ASC, id ASC
             ) AS rn
      FROM public.alerts
    )
    DELETE FROM public.alerts a
    USING ranked r
    WHERE a.id = r.id AND r.rn > 1;
  END IF;
END $$;

-- Create a unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS ux_alerts_dedupe
ON public.alerts (user_id, type, message, hour_bucket);

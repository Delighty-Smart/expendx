-- Ensure created_at is not null to support generated column
UPDATE public.alerts SET created_at = NOW() WHERE created_at IS NULL;

-- Add hour_bucket generated column (immutable expression)
ALTER TABLE public.alerts
ADD COLUMN IF NOT EXISTS hour_bucket timestamptz
GENERATED ALWAYS AS (
  date_trunc('hour', created_at)
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
               PARTITION BY user_id, type, message, date_trunc('hour', created_at)
               ORDER BY created_at ASC, id ASC
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

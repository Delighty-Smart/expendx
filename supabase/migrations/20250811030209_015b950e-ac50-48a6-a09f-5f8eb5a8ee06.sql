-- 1) Add a physical hour_bucket column (no generated expr)
ALTER TABLE public.alerts
ADD COLUMN IF NOT EXISTS hour_bucket timestamptz;

-- 2) Backfill hour_bucket for existing rows
UPDATE public.alerts
SET hour_bucket = date_trunc('hour', COALESCE(created_at, NOW()))
WHERE hour_bucket IS NULL;

-- 3) Create a trigger function to keep hour_bucket in sync
CREATE OR REPLACE FUNCTION public.set_alert_hour_bucket()
RETURNS trigger AS $$
BEGIN
  NEW.created_at := COALESCE(NEW.created_at, NOW());
  NEW.hour_bucket := date_trunc('hour', NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) Attach triggers for INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_set_alert_hour_bucket_ins ON public.alerts;
CREATE TRIGGER trg_set_alert_hour_bucket_ins
BEFORE INSERT ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.set_alert_hour_bucket();

DROP TRIGGER IF EXISTS trg_set_alert_hour_bucket_upd ON public.alerts;
CREATE TRIGGER trg_set_alert_hour_bucket_upd
BEFORE UPDATE OF created_at ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.set_alert_hour_bucket();

-- 5) Clean up existing duplicates (keep earliest per hour group)
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, type, message, hour_bucket
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.alerts
)
DELETE FROM public.alerts a
USING ranked r
WHERE a.id = r.id AND r.rn > 1;

-- 6) Enforce uniqueness going forward
CREATE UNIQUE INDEX IF NOT EXISTS ux_alerts_dedupe
ON public.alerts (user_id, type, message, hour_bucket);

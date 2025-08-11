-- Harden function created in previous migration by setting search_path
CREATE OR REPLACE FUNCTION public.set_alert_hour_bucket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.created_at := COALESCE(NEW.created_at, NOW());
  NEW.hour_bucket := date_trunc('hour', NEW.created_at);
  RETURN NEW;
END;
$$;
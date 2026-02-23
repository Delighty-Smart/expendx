-- Migration: Automation for Push Notifications
-- Description: Adds a trigger to call the 'send-push' Edge Function whenever a new alert is created.

-- !!! IMPORTANT: FILL THESE IN BEFORE RUNNING !!!
-- 1. YOUR_PROJECT_REF: The string like 'xyzabc...' from your Supabase URL
-- 2. YOUR_SERVICE_ROLE_KEY: Found in Settings -> API -> service_role (keep this secret!)

CREATE OR REPLACE FUNCTION public.notify_push_on_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_ref TEXT := 'wulhjbwijgbticuslygm'; 
  service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bGhqYndpamdidGljdXNseWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzExNDk4MiwiZXhwIjoyMDUyNjkwOTgyfQ.-LtWEKQfoSLCcyaJhVRhUTFDv7oiIVdv4B8HnkK1jtw';
  payload JSONB;
BEGIN
  -- Construct the payload
  payload := jsonb_build_object(
    'user_id', NEW.user_id,
    'title', NEW.title,
    'message', NEW.message,
    'tag', NEW.type
  );

  -- Call the Supabase Edge Function
  PERFORM
    net.http_post(
      url := 'https://' || project_ref || '.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := payload
    );

  RETURN NEW;
END;
$$;

-- Create the trigger on the 'alerts' table
DROP TRIGGER IF EXISTS tr_push_on_alert ON public.alerts;
CREATE TRIGGER tr_push_on_alert
AFTER INSERT ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.notify_push_on_alert();

COMMENT ON FUNCTION public.notify_push_on_alert IS 'Automatically triggers a background push notification via Edge Functions whenever a new alert is generated in the alerts table.';

-- Migration: Automation for Push Notifications
-- Description: Adds a trigger to call the 'send-push' Edge Function whenever a new alert is created.

-- 1. Create the function that calls the Edge Function
CREATE OR REPLACE FUNCTION public.notify_push_on_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
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
  -- Note: You need to ensure the Edge Function name matches what is deployed
  PERFORM
    net.http_post(
      url := (SELECT value FROM settings WHERE key = 'edge_function_url') || '/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := payload
    );

  RETURN NEW;
END;
$$;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS tr_push_on_alert ON public.alerts;
CREATE TRIGGER tr_push_on_alert
AFTER INSERT ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.notify_push_on_alert();

-- 3. Note for User
COMMENT ON FUNCTION public.notify_push_on_alert IS 'Automatically triggers a background push notification via Edge Functions whenever a new alert is generated in the database.';

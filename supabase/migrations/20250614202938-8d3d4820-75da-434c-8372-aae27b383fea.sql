
-- Create notification_preferences table for user settings
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  weekly_recap BOOLEAN DEFAULT true,
  budget_nudges BOOLEAN DEFAULT true,
  unusual_activity BOOLEAN DEFAULT true,
  daily_log_reminder BOOLEAN DEFAULT true,
  savings_progress BOOLEAN DEFAULT true,
  month_reset_preview BOOLEAN DEFAULT true,
  recurring_expense_reminder BOOLEAN DEFAULT true,
  night_owl_checkin BOOLEAN DEFAULT false,
  monthly_snapshot BOOLEAN DEFAULT true,
  reflection_prompts BOOLEAN DEFAULT false,
  custom_goal_reminder BOOLEAN DEFAULT true,
  business_mode_nudges BOOLEAN DEFAULT false,
  preferred_time TIME DEFAULT '20:00:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences" 
  ON public.notification_preferences 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notification preferences" 
  ON public.notification_preferences 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" 
  ON public.notification_preferences 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create user_notification_logs table to track sent notifications
CREATE TABLE public.user_notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add RLS policies for user_notification_logs
ALTER TABLE public.user_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification logs" 
  ON public.user_notification_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification logs" 
  ON public.user_notification_logs 
  FOR INSERT 
  WITH CHECK (true);

-- Add trigger to automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating notification preferences: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger for new user notification preferences
CREATE TRIGGER on_auth_user_created_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_notification_preferences();

-- Add indexes for better performance
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX idx_user_notification_logs_user_id ON public.user_notification_logs(user_id);
CREATE INDEX idx_user_notification_logs_type_sent_at ON public.user_notification_logs(notification_type, sent_at);

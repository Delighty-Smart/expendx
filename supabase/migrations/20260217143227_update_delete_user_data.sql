-- Update delete_user_data function to include subscriptions table
-- and ensure comprehensive data cleanup
-- Note: purposely excluding user_feedback to preserve exit surveys

CREATE OR REPLACE FUNCTION delete_user_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate user
  IF target_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Delete data from all user-related tables
  -- Order matters for foreign key constraints (delete children first)
  
  -- Transactional data
  DELETE FROM public.transactions WHERE user_id = target_user_id;
  DELETE FROM public.user_notification_logs WHERE user_id = target_user_id;
  DELETE FROM public.alerts WHERE user_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  
  -- Planning data
  DELETE FROM public.monthly_income_estimates WHERE user_id = target_user_id;
  DELETE FROM public.recurring_templates WHERE user_id = target_user_id;
  DELETE FROM public.budget_categories WHERE user_id = target_user_id;
  DELETE FROM public.savings_goals WHERE user_id = target_user_id;
  DELETE FROM public.subscriptions WHERE user_id = target_user_id; -- Added this
  
  -- Configuration data
  DELETE FROM public.user_categories WHERE user_id = target_user_id;
  DELETE FROM public.notification_preferences WHERE user_id = target_user_id;
  DELETE FROM public.user_streaks WHERE user_id = target_user_id;
  DELETE FROM public.user_settings WHERE user_id = target_user_id;
  
  -- DO NOT delete user_profiles (account) or user_feedback (exit survey)

  -- Return success
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error if needed, or just return false
    RETURN FALSE;
END;
$$;


-- Create a secure function to delete all user data
CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  -- Security check: only allow users to delete their own data
  IF current_user_id IS NULL OR current_user_id != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Users can only delete their own data';
  END IF;
  
  -- Delete user data in correct order (respecting foreign key constraints)
  DELETE FROM public.alerts WHERE user_id = target_user_id;
  DELETE FROM public.user_feedback WHERE user_id = target_user_id;
  DELETE FROM public.feedback_responses WHERE admin_id = target_user_id;
  DELETE FROM public.user_notification_logs WHERE user_id = target_user_id;
  DELETE FROM public.notification_preferences WHERE user_id = target_user_id;
  DELETE FROM public.transactions WHERE user_id = target_user_id;
  DELETE FROM public.budget_categories WHERE user_id = target_user_id;
  DELETE FROM public.savings_goals WHERE user_id = target_user_id;
  DELETE FROM public.user_categories WHERE user_id = target_user_id;
  DELETE FROM public.user_settings WHERE user_id = target_user_id;
  DELETE FROM public.user_streaks WHERE user_id = target_user_id;
  DELETE FROM public.monthly_income_estimates WHERE user_id = target_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise
    RAISE EXCEPTION 'Error deleting user data: %', SQLERRM;
END;
$$;

-- Create a secure function to delete user account completely
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  -- Security check: only allow users to delete their own account
  IF current_user_id IS NULL OR current_user_id != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Users can only delete their own account';
  END IF;
  
  -- First delete all user data
  PERFORM public.delete_user_data(target_user_id);
  
  -- Then delete the user profile
  DELETE FROM public.user_profiles WHERE id = target_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise
    RAISE EXCEPTION 'Error deleting user account: %', SQLERRM;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;

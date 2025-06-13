
-- Fix the infinite recursion in RLS policies by using a simpler approach
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view feedback responses" ON public.feedback_responses;
DROP POLICY IF EXISTS "Admins can insert feedback responses" ON public.feedback_responses;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Admins can view all savings goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Admins can insert alerts" ON public.alerts;

-- Create a security definer function to check admin role safely
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can update all profiles"
ON public.user_profiles FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can insert profiles"
ON public.user_profiles FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can view all feedback"
ON public.user_feedback FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can view feedback responses"
ON public.feedback_responses FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can insert feedback responses"
ON public.feedback_responses FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can view all transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can view all streaks"
ON public.user_streaks FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can view all savings goals"
ON public.savings_goals FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can insert alerts"
ON public.alerts FOR INSERT
WITH CHECK (public.is_admin());

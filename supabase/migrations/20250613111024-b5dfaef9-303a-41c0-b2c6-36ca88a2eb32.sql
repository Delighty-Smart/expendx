
-- Fix the admin policy for user_profiles to properly check if the current user is admin
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

CREATE POLICY "Admins can view all profiles"
ON public.user_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Also fix the user feedback policy to ensure admins can see all feedback
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.user_feedback;

CREATE POLICY "Admins can view all feedback"
ON public.user_feedback FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

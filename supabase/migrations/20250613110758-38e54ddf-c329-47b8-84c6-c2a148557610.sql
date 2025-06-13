
-- Drop existing policies if they exist and recreate them to ensure correct permissions
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.user_profiles;

-- Enable RLS on user_profiles table (safe if already enabled)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT
USING (auth.uid() = id);

-- Allow admin users to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles FOR SELECT
USING (role = 'admin');

-- Allow admin users to update any user's role and profile
CREATE POLICY "Admins can update all profiles"
ON public.user_profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow admin users to insert new profiles (for user creation)
CREATE POLICY "Admins can insert profiles"
ON public.user_profiles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Drop existing feedback policies if they exist
DROP POLICY IF EXISTS "Users can view own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.user_feedback;

-- Enable RLS on user_feedback table
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.user_feedback FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own feedback
CREATE POLICY "Users can insert own feedback"
ON public.user_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow admin users to view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.user_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Drop existing feedback response policies if they exist
DROP POLICY IF EXISTS "Admins can view feedback responses" ON public.feedback_responses;
DROP POLICY IF EXISTS "Admins can insert feedback responses" ON public.feedback_responses;

-- Enable RLS on feedback_responses table
ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

-- Allow admin users to view all feedback responses
CREATE POLICY "Admins can view feedback responses"
ON public.feedback_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow admin users to insert feedback responses
CREATE POLICY "Admins can insert feedback responses"
ON public.feedback_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Drop existing transaction policies if they exist
DROP POLICY IF EXISTS "Users can access own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;

-- Enable RLS on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Allow users to access their own transactions
CREATE POLICY "Users can access own transactions"
ON public.transactions FOR ALL
USING (auth.uid() = user_id);

-- Allow admins to view all transactions (for stats)
CREATE POLICY "Admins can view all transactions"
ON public.transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Drop existing streak policies if they exist
DROP POLICY IF EXISTS "Users can access own streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Admins can view all streaks" ON public.user_streaks;

-- Enable RLS on user_streaks table
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- Allow users to access their own streaks
CREATE POLICY "Users can access own streaks"
ON public.user_streaks FOR ALL
USING (auth.uid() = user_id);

-- Allow admins to view all streaks (for stats)
CREATE POLICY "Admins can view all streaks"
ON public.user_streaks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Drop existing savings goal policies if they exist
DROP POLICY IF EXISTS "Users can access own savings goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Admins can view all savings goals" ON public.savings_goals;

-- Enable RLS on savings_goals table
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- Allow users to access their own savings goals
CREATE POLICY "Users can access own savings goals"
ON public.savings_goals FOR ALL
USING (auth.uid() = user_id);

-- Allow admins to view all savings goals (for stats)
CREATE POLICY "Admins can view all savings goals"
ON public.savings_goals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Drop existing alert policies if they exist
DROP POLICY IF EXISTS "Users can access own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Admins can insert alerts" ON public.alerts;

-- Enable RLS on alerts table
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Allow users to access their own alerts
CREATE POLICY "Users can access own alerts"
ON public.alerts FOR ALL
USING (auth.uid() = user_id);

-- Allow admins to insert alerts for any user
CREATE POLICY "Admins can insert alerts"
ON public.alerts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

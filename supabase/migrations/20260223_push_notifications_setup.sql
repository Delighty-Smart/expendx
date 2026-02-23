-- Migration: Create Push Subscriptions table
-- Description: Stores Web Push subscriptions for PWA users.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Separate index to handle the JSONB expression correctly
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subs_user_endpoint 
ON public.push_subscriptions (user_id, (subscription->>'endpoint'));

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own subscriptions"
ON public.push_subscriptions FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Add commentary
COMMENT ON TABLE public.push_subscriptions IS 'Stores Web Push notifications subscriptions for PWA users.';

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service_provider TEXT NOT NULL,
  card_type TEXT NOT NULL,
  last_four_digits TEXT NOT NULL,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('monthly', 'annual')),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'canceled', 'expired')),
  next_billing_date DATE,
  last_transaction_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" 
ON public.subscriptions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add "Subscriptions" as a default expense category if it doesn't exist
-- First, let's create a function to safely add the subscriptions category
CREATE OR REPLACE FUNCTION add_subscriptions_category()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For each user, check if they have a "Subscriptions" category
  -- If not, we don't need to do anything as it will be handled by the frontend
  -- If they do, we'll let the frontend handle the merging
  NULL;
END;
$$;
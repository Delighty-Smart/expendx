-- Add subscription to user_categories_type_check
ALTER TABLE public.user_categories DROP CONSTRAINT IF EXISTS user_categories_type_check;

ALTER TABLE public.user_categories ADD CONSTRAINT user_categories_type_check 
CHECK (type IN ('debit', 'credit', 'savings', 'subscription'));

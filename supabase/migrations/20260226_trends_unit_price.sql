-- Add optional unit_price and quantity columns to transactions
-- These columns are nullable for full backward compatibility.
-- When both are provided, amount = unit_price * quantity (enforced on the frontend).
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS unit_price NUMERIC NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS quantity  NUMERIC NULL;

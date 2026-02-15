-- Migration: Optimize Transaction Table Performance
-- Description: Adds indexes to frequently queried columns to speed up dashboard and report generation.

-- Index for user_id to speed up all user-specific queries (crucial for RLS as well)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);

-- Index for date specifically for range queries (Dashboard monthly stats, Reports)
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);

-- Composite index for user_id and archived state (very common filter)
CREATE INDEX IF NOT EXISTS idx_transactions_user_archived ON public.transactions(user_id, archived);

-- Composite index for user_id, type and date (Dashboard charts)
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date ON public.transactions(user_id, type, date DESC);

-- Composite index for categories (Spending by category chart)
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON public.transactions(user_id, category);

-- Note: After running this, existing queries like:
-- SELECT * FROM transactions WHERE user_id = '...' AND archived = false AND date >= '...'
-- will be significantly faster.

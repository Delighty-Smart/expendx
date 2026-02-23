-- Migration: Data Loading Optimization
-- Description: Adds indexes and an RPC function for high-performance balance summary retrieval.

-- 1. Optimized indexes for common query patterns
-- Already partially covered in optimize_performance.sql, but ensuring these exist:
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_desc ON public.transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date ON public.transactions (user_id, type, date DESC);

-- 2. RPC for instant balance and monthly summary
-- This avoids fetching all transactions just to calculate balance on the client
CREATE OR REPLACE FUNCTION get_user_balance_summary(p_user_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
    total_balance NUMERIC,
    monthly_income NUMERIC,
    monthly_expenses NUMERIC,
    monthly_savings NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH totals AS (
        -- Calculate all-time balance (only non-archived)
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN type IN ('debit', 'savings') THEN amount ELSE 0 END), 0) as balance_all_time
        FROM transactions
        WHERE user_id = p_user_id AND archived = false
    ),
    monthly AS (
        -- Calculate specific month totals
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as income,
            COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as expenses,
            COALESCE(SUM(CASE WHEN type = 'savings' THEN amount ELSE 0 END), 0) as savings
        FROM transactions
        WHERE user_id = p_user_id 
          AND archived = false 
          AND date >= p_start_date 
          AND date <= p_end_date
    )
    SELECT 
        (SELECT balance_all_time FROM totals),
        (SELECT income FROM monthly),
        (SELECT expenses FROM monthly),
        (SELECT savings FROM monthly);
END;
$$;

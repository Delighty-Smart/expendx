import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BudgetStatus {
  category: string;
  spent: number;
  limit: number;
  percentage: number;
}

export function useBudgetAlerts() {
  const { toast } = useToast();

  const { data: budgetStatus } = useQuery({
    queryKey: ['budget-status'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get current month's start date
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      // Get budgets
      const { data: budgets } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('user_id', user.id);

      if (!budgets || budgets.length === 0) return [];

      // Get transactions for current month
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'debit')
        .gte('date', startOfMonth)
        .eq('archived', false);

      // Calculate spending per category
      const status: BudgetStatus[] = budgets.map(budget => {
        const spent = transactions
          ?.filter(t => t.category === budget.category)
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        return {
          category: budget.category,
          spent,
          limit: Number(budget.monthly_limit),
          percentage: (spent / Number(budget.monthly_limit)) * 100
        };
      });

      return status;
    },
    refetchInterval: 60000, // Check every minute
  });

  useEffect(() => {
    if (!budgetStatus) return;

    budgetStatus.forEach(status => {
      // Alert at 80% threshold
      if (status.percentage >= 80 && status.percentage < 90) {
        toast({
          title: '⚠️ Budget Alert',
          description: `You've used ${status.percentage.toFixed(0)}% of your ${status.category} budget`,
          duration: 5000,
        });
      }
      
      // Alert at 90% threshold
      if (status.percentage >= 90 && status.percentage < 100) {
        toast({
          title: '🚨 Budget Warning',
          description: `You've used ${status.percentage.toFixed(0)}% of your ${status.category} budget!`,
          variant: 'destructive',
          duration: 7000,
        });
      }

      // Alert when exceeded
      if (status.percentage >= 100) {
        toast({
          title: '❌ Budget Exceeded',
          description: `You've exceeded your ${status.category} budget by ${(status.spent - status.limit).toFixed(2)}`,
          variant: 'destructive',
          duration: 10000,
        });
      }
    });
  }, [budgetStatus, toast]);

  return { budgetStatus };
}

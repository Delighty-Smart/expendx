import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notificationScheduler } from '@/services/notificationScheduler';

interface BudgetStatus {
  category: string;
  spent: number;
  limit: number;
  percentage: number;
}

export function useBudgetAlerts() {
  const { toast } = useToast();
  const notifiedRef = useRef<Record<string, number>>({}); // Track last notified percentage to avoid spam

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
    refetchInterval: 30000, // Check every 30 seconds for smarter response
  });

  useEffect(() => {
    if (!budgetStatus) return;

    const triggerAlert = async (status: BudgetStatus, title: string, message: string, threshold: number) => {
      const key = `${status.category}-${threshold}`;
      const lastNotified = notifiedRef.current[key];
      const now = Date.now();

      // Only notify once every 24 hours for the same threshold and category
      if (!lastNotified || now - lastNotified > 24 * 60 * 60 * 1000) {
        toast({
          title,
          description: message,
          variant: threshold >= 90 ? 'destructive' : 'default',
          duration: threshold >= 100 ? 10000 : 5000,
        });

        // Trigger device notification
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          notificationScheduler.handleImmediateAlert(
            user.id,
            'budget_breach',
            title,
            message
          );
        }

        notifiedRef.current[key] = now;
      }
    };

    budgetStatus.forEach(status => {
      // Alert when exceeded
      if (status.percentage >= 100) {
        triggerAlert(
          status,
          '❌ Budget Exceeded',
          `You've exceeded your ${status.category} budget by ${(status.spent - status.limit).toFixed(2)}`,
          100
        );
      }
      // Alert at 90% threshold
      else if (status.percentage >= 90) {
        triggerAlert(
          status,
          '🚨 Budget Warning',
          `Critical: You've used ${status.percentage.toFixed(0)}% of your ${status.category} budget!`,
          90
        );
      }
      // Alert at 80% threshold
      else if (status.percentage >= 80) {
        triggerAlert(
          status,
          '⚠️ Budget Alert',
          `Heads up: You've used ${status.percentage.toFixed(0)}% of your ${status.category} budget`,
          80
        );
      }
    });
  }, [budgetStatus, toast]);

  return { budgetStatus };
}

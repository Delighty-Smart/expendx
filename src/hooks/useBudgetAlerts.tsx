import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { notificationScheduler } from '@/services/notificationScheduler';
import { ToastAction } from "@/components/ui/toast";
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';

interface BudgetStatus {
  category: string;
  spent: number;
  limit: number;
  percentage: number;
}

interface AlertPreference {
  snoozedUntil?: number;
  ignored?: {
    month: string;
    amount: number;
    threshold: number;
  };
}

export function useBudgetAlerts() {
  const { toast, dismiss } = useToast();
  const notifiedRef = useRef<Record<string, number>>({});

  const { data: budgetStatus } = useQuery({
    queryKey: ['budget-status'],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return [];

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const budgets = enhancedOfflineManager.getBudgets();
      if (!budgets || budgets.length === 0) return [];

      const transactions = enhancedOfflineManager.getTransactions({
        type: 'debit',
        startDate: startOfMonth
      });

      const status: BudgetStatus[] = budgets.map((budget: any) => {
        const spent = transactions
          .filter(t => t.category === budget.category)
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const limit = Number(budget.monthly_limit || 0);

        return {
          category: budget.category,
          spent,
          limit,
          percentage: limit > 0 ? (spent / limit) * 100 : 0
        };
      });

      return status;
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!budgetStatus) return;

    const getPreferences = (): Record<string, AlertPreference> => {
      try {
        return JSON.parse(localStorage.getItem('budgetAlertPreferences') || '{}');
      } catch {
        return {};
      }
    };

    const savePreferences = (prefs: Record<string, AlertPreference>) => {
      localStorage.setItem('budgetAlertPreferences', JSON.stringify(prefs));
    };

    const triggerAlert = async (status: BudgetStatus, title: string, message: string, threshold: number) => {
      const key = `${status.category}-${threshold}`;
      const now = Date.now();
      const currentMonth = new Date().toISOString().slice(0, 7);

      const prefs = getPreferences();
      const pref = prefs[status.category] || {};

      if (pref.snoozedUntil && pref.snoozedUntil > now) {
        return;
      }

      if (pref.ignored && pref.ignored.month === currentMonth) {
        if (pref.ignored.threshold >= threshold && status.spent < pref.ignored.amount * 1.05) {
          return;
        }
      }

      const lastNotified = notifiedRef.current[key];
      if (lastNotified && now - lastNotified < 60 * 60 * 1000) {
        return;
      }

      notifiedRef.current[key] = now;

      const handleSnooze = () => {
        const updatedPrefs = getPreferences();
        updatedPrefs[status.category] = {
          ...updatedPrefs[status.category],
          snoozedUntil: Date.now() + 4 * 60 * 60 * 1000
        };
        savePreferences(updatedPrefs);
        dismiss();
      };

      const handleIgnore = () => {
        const updatedPrefs = getPreferences();
        updatedPrefs[status.category] = {
          ...updatedPrefs[status.category],
          ignored: {
            month: currentMonth,
            amount: status.spent,
            threshold: threshold
          }
        };
        savePreferences(updatedPrefs);
        dismiss();
      };

      toast({
        title,
        description: message,
        variant: threshold >= 90 ? 'destructive' : 'default',
        duration: Infinity,
        action: (
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <ToastAction altText="Remind me later" onClick={handleSnooze} className="whitespace-nowrap">
              Remind me later
            </ToastAction>
            <ToastAction altText="Don't remind me" onClick={handleIgnore} className="border-destructive/30 hover:bg-destructive/10 whitespace-nowrap">
              Don't remind me
            </ToastAction>
          </div>
        ),
      });

      const user = auth.currentUser;
      if (user) {
        notificationScheduler.handleImmediateAlert(
          user.uid,
          'budget_breach',
          title,
          message
        );
      }
    };

    budgetStatus.forEach(status => {
      if (status.percentage >= 100) {
        triggerAlert(
          status,
          '❌ Budget Exceeded',
          `You've exceeded your ${status.category} budget by ${(status.spent - status.limit).toFixed(2)}`,
          100
        );
      } else if (status.percentage >= 90) {
        triggerAlert(
          status,
          '🚨 Budget Warning',
          `Critical: You've used ${status.percentage.toFixed(0)}% of your ${status.category} budget!`,
          90
        );
      } else if (status.percentage >= 80) {
        triggerAlert(
          status,
          '⚠️ Budget Alert',
          `Heads up: You've used ${status.percentage.toFixed(0)}% of your ${status.category} budget`,
          80
        );
      }
    });
  }, [budgetStatus, toast, dismiss]);

  return { budgetStatus };
}

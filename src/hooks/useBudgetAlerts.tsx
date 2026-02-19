import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notificationScheduler } from '@/services/notificationScheduler';
import { ToastAction } from "@/components/ui/toast";

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
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      const prefs = getPreferences();
      const pref = prefs[status.category] || {};

      console.log(`Checking alert for ${status.category}: ${status.percentage}% (Threshold: ${threshold})`);

      // Check if snoozed
      if (pref.snoozedUntil && pref.snoozedUntil > now) {
        console.log(`Alert snoozed until ${new Date(pref.snoozedUntil).toLocaleTimeString()}`);
        return;
      }

      // Check if ignored logic applies
      if (pref.ignored && pref.ignored.month === currentMonth) {
        // If ignored at this threshold (or higher) and spending hasn't increased by > 5%, suppress
        if (pref.ignored.threshold >= threshold && status.spent < pref.ignored.amount * 1.05) {
          console.log(`Suppressing alert for ${status.category}: Ignored by user preference.`);
          return;
        }
      }

      // Check ephemeral notifiedRef to avoid spamming every render tick if not dismissed
      // Only notify once per session/reload unless significant change, relying on localStorage for long-term suppression
      const lastNotified = notifiedRef.current[key];
      if (lastNotified && now - lastNotified < 60 * 60 * 1000) { // 1 hour debounce for same session if not snoozed
        console.log(`Alert debounced (last notified: ${new Date(lastNotified).toLocaleTimeString()})`);
        return;
      }

      // Update ref immediately to prevent re-entry/infinite loops
      notifiedRef.current[key] = now;
      console.log(`Triggering alert for ${status.category}`);

      const handleSnooze = () => {
        const updatedPrefs = getPreferences();
        updatedPrefs[status.category] = {
          ...updatedPrefs[status.category],
          snoozedUntil: Date.now() + 4 * 60 * 60 * 1000 // 4 hours
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
        duration: Infinity, // Keep open until interacted
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

      // Trigger device notification (persist this behavior)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        notificationScheduler.handleImmediateAlert(
          user.id,
          'budget_breach',
          title,
          message
        );
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
  }, [budgetStatus, toast, dismiss]);

  return { budgetStatus };
}

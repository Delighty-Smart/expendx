
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types/transactions';

interface BudgetCategory {
  id: string;
  category: string;
  monthly_limit: number;
  user_id: string;
}

interface BudgetAlert {
  category: string;
  spent: number;
  limit: number;
  percentage: number;
}

export const getBudgetAlerts = (
  budgetCategories: BudgetCategory[],
  transactions: Transaction[]
): BudgetAlert[] => {
  if (!budgetCategories || !transactions) return [];
  
  return budgetCategories
    .map((budget) => {
      const spent = transactions
        .filter((t) => t.category === budget.category && t.type === "debit")
        .reduce((sum, t) => sum + t.amount, 0);
      
      const percentage = budget.monthly_limit > 0 ? (spent / budget.monthly_limit) * 100 : 0;
      
      if (percentage >= 90) {
        return {
          category: budget.category,
          spent,
          limit: budget.monthly_limit,
          percentage,
        };
      }
      return null;
    })
    .filter((alert): alert is NonNullable<typeof alert> => alert !== null);
};

export const createBudgetAlert = async (alert: BudgetAlert): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const alertLevel = alert.percentage >= 100 ? 'exceeded' : 'warning';
    const title = alertLevel === 'exceeded' ? 'Budget Exceeded' : 'Budget Alert';
    const message = `You've spent ${alert.percentage.toFixed(1)}% of your ${alert.category} budget (${alert.spent.toFixed(2)} of ${alert.limit.toFixed(2)})`;
    
    const { error } = await supabase
      .from('alerts')
      .insert({
        user_id: user.id,
        title,
        message,
        type: 'budget_alert',
        read: false
      });
      
    if (error) {
      console.error("Error creating budget alert:", error);
    }
  } catch (error) {
    console.error("Error in createBudgetAlert:", error);
  }
};

export const syncBudgetAlertsToNotifications = async (
  budgetCategories: BudgetCategory[] | undefined,
  transactions: Transaction[] | undefined
): Promise<void> => {
  if (!budgetCategories || !transactions) return;
  
  const alerts = getBudgetAlerts(budgetCategories, transactions);
  
  // Create alerts for each budget warning/exceeded threshold
  for (const alert of alerts) {
    await createBudgetAlert(alert);
  }
};

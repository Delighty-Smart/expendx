
import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { PlusCircle, AlertCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BudgetCard } from "@/components/BudgetCard";
import { BudgetChart } from "@/components/BudgetChart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSettings } from "@/contexts/SettingsContext";
import { Transaction, TransactionType, TransactionCategory } from "@/types/transactions";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useNavigate } from "react-router-dom";
import { getBudgetAlerts, syncBudgetAlertsToNotifications } from "@/services/budgetAlerts";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface TransactionData {
  id: string;
  amount: number;
  type: string;
  category: string;
  date: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const BudgetsPage = () => {
  const { currency } = useSettings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const today = new Date();
  const firstDayOfMonth = startOfMonth(today).toISOString();
  const lastDayOfMonth = endOfMonth(today).toISOString();

  const { data: budgetCategories, refetch: refetchBudgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("*")
        .order("category");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: monthlyIncome, refetch: refetchIncome } = useQuery({
    queryKey: ["monthly_income"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_income_estimates")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: transactionsData } = useQuery({
    queryKey: ["transactions", firstDayOfMonth, lastDayOfMonth],
    queryFn: async () => {
      console.log("Fetching transactions for date range:", firstDayOfMonth, "to", lastDayOfMonth);
      
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("date", firstDayOfMonth)
        .lte("date", lastDayOfMonth);

      if (error) {
        console.error("Error fetching transactions:", error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} transactions in the current month`);
      return data as TransactionData[] || [];
    },
  });

  const transactions: Transaction[] = (transactionsData || []).map(transaction => ({
    ...transaction,
    type: transaction.type as TransactionType,
    category: transaction.category as TransactionCategory
  }));

  const handleRealTimeUpdates = useCallback(() => {
    console.log('Transaction data changed, refreshing...');
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
  }, [queryClient]);

  useRealtimeSubscription('transactions', '*', handleRealTimeUpdates);
  useRealtimeSubscription('budget_categories', '*', handleRealTimeUpdates);
  useRealtimeSubscription('monthly_income_estimates', '*', handleRealTimeUpdates);

  useEffect(() => {
    if (budgetCategories && transactions) {
      syncBudgetAlertsToNotifications(budgetCategories, transactions);
    }
  }, [budgetCategories, transactions]);

  const calculateSpending = useCallback((category: string) => {
    if (!transactions) return 0;
    
    const spending = transactions
      .filter((t) => t.category === category && t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0);
      
    return spending;
  }, [transactions]);

  const calculateSavings = useCallback(() => {
    if (!transactions) return 0;
    
    const savings = transactions
      .filter((t) => t.type === "savings")
      .reduce((sum, t) => sum + t.amount, 0);
      
    return savings;
  }, [transactions]);

  const savingsLimit = budgetCategories?.find(b => b.category === "Savings")?.monthly_limit || 0;
  const currentSavings = calculateSavings();
  const savingsPercentage = savingsLimit > 0 ? (currentSavings / savingsLimit) * 100 : 0;

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const alerts = getBudgetAlerts(budgetCategories || [], transactions || []);

  const totalMonthlySpending = transactions
    ?.filter(t => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0) || 0;

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral">Budget Tracking</h1>
          <div className="flex flex-wrap gap-2">
            <Button
              className="flex items-center gap-2 text-sm h-9"
              onClick={() => navigate("/set-income")}
            >
              <DollarSign className="h-4 w-4" />
              Set Monthly Income
            </Button>
            <Button
              className="flex items-center gap-2 text-sm h-9"
              onClick={() => navigate("/add-budget")}
            >
              <PlusCircle className="h-4 w-4" />
              Set Budget Limit
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Estimated Monthly Income</p>
          <p className="text-xl sm:text-2xl font-semibold">
            {currency.symbol}{formatAmount(monthlyIncome?.amount ?? 0)}
          </p>
        </Card>

        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Alert variant="destructive" key={alert.category}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-sm font-medium">Budget Alert</AlertTitle>
                <AlertDescription className="text-xs">
                  You've spent {currency.symbol}{formatAmount(alert.spent)} of your {currency.symbol}{formatAmount(alert.limit)} budget for {alert.category} ({alert.percentage.toFixed(1)}%)
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Budget Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {budgetCategories?.filter(budget => budget.category !== "Savings").map((budget) => (
              <BudgetCard
                key={budget.id}
                id={budget.id}
                category={budget.category}
                limit={budget.monthly_limit}
                spent={calculateSpending(budget.category)}
                currency={currency}
                onEditClick={() => navigate("/edit-budget", { state: { budget } })}
              />
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Spending Distribution</h2>
            <BudgetChart
              budgets={budgetCategories || []}
              transactions={transactions || []}
              currency={currency}
            />
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Savings Progress</h2>
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="relative w-48 h-48">
                <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-muted/20"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 45}`}
                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - savingsPercentage / 100)}`}
                    className="text-green-500 transition-all duration-700 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground">Current Savings</p>
                  <p className="text-2xl font-bold">{currency.symbol}{formatAmount(currentSavings)}</p>
                  {savingsLimit > 0 && (
                    <p className="text-sm text-muted-foreground">
                      of {currency.symbol}{formatAmount(savingsLimit)} ({Math.round(savingsPercentage)}%)
                    </p>
                  )}
                </div>
              </div>

              <Button variant="outline" onClick={() => navigate("/set-savings-goal")}>
                Set Savings Goal
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default BudgetsPage;

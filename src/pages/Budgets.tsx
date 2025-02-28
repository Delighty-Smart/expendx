
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { PlusCircle, AlertCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BudgetForm } from "@/components/BudgetForm";
import { BudgetChart } from "@/components/BudgetChart";
import { BudgetCard } from "@/components/BudgetCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MonthlyIncomeForm } from "@/components/MonthlyIncomeForm";
import { useSettings } from "@/contexts/SettingsContext";
import { Transaction } from "@/types/transactions";
import { format, startOfMonth, endOfMonth } from "date-fns";

const BudgetsPage = () => {
  const { currency } = useSettings();
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
  const queryClient = useQueryClient();

  // Get the current month's date range
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

  const { data: transactions } = useQuery({
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
      return data || [];
    },
  });

  // Ensure budget updates invalidate transaction queries to refresh all components
  const handleBudgetUpdate = () => {
    refetchBudgets();
    // Ensure all dependent queries are refreshed as well
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  // Same for income updates
  const handleIncomeUpdate = () => {
    refetchIncome();
    // Ensure all dependent queries are refreshed
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const calculateSpending = (category: string) => {
    if (!transactions) return 0;
    
    const spending = transactions
      .filter((t) => t.category === category && t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0);
      
    return spending;
  };

  const calculateSavings = () => {
    if (!transactions) return 0;
    
    const savings = transactions
      .filter((t) => t.type === "savings")
      .reduce((sum, t) => sum + t.amount, 0);
      
    return savings;
  };

  const savingsLimit = budgetCategories?.find(b => b.category === "Savings")?.monthly_limit || 0;
  const currentSavings = calculateSavings();
  const savingsPercentage = savingsLimit > 0 ? (currentSavings / savingsLimit) * 100 : 0;

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getBudgetAlerts = () => {
    if (!budgetCategories || !transactions) return [];
    
    return budgetCategories
      .map((budget) => {
        const spent = calculateSpending(budget.category);
        // Avoid division by zero
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

  const alerts = getBudgetAlerts();

  // Debug logging to help verify transactions are being calculated correctly
  console.log("Current transactions count:", transactions?.length);
  
  // Calculate total monthly spending for all expense categories
  const totalMonthlySpending = transactions
    ?.filter(t => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0) || 0;
  
  console.log("Total monthly spending:", totalMonthlySpending);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-neutral">Budget Tracking</h1>
          <div className="flex flex-wrap gap-2">
            <Button
              className="flex items-center gap-2"
              onClick={() => setIsIncomeFormOpen(true)}
            >
              <DollarSign className="h-4 w-4" />
              Set Monthly Income
            </Button>
            <Button
              className="flex items-center gap-2"
              onClick={() => setIsBudgetFormOpen(true)}
            >
              <PlusCircle className="h-4 w-4" />
              Set Budget Limit
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Estimated Monthly Income</p>
          <p className="text-2xl font-semibold">
            {currency.symbol}{formatAmount(monthlyIncome?.amount ?? 0)}
          </p>
        </Card>

        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Alert variant="destructive" key={alert.category}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Budget Alert</AlertTitle>
                <AlertDescription>
                  You've spent {currency.symbol}{formatAmount(alert.spent)} of your {currency.symbol}{formatAmount(alert.limit)} budget for {alert.category} ({alert.percentage.toFixed(1)}%)
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Budget Progress</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetCategories?.map((budget) => (
              <BudgetCard
                key={budget.id}
                category={budget.category}
                limit={budget.monthly_limit}
                spent={calculateSpending(budget.category)}
                currency={currency}
                onBudgetUpdate={handleBudgetUpdate}
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
              <div className="relative">
                <svg width="200" height="200" className="-rotate-90">
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-muted/20"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 90}`}
                    strokeDashoffset={`${2 * Math.PI * 90 * (1 - savingsPercentage / 100)}`}
                    className="text-green-500"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground">Current Savings</p>
                  <p className="text-2xl font-bold">{currency.symbol}{formatAmount(currentSavings)}</p>
                  <p className="text-sm text-muted-foreground">of {currency.symbol}{formatAmount(savingsLimit)}</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setIsBudgetFormOpen(true);
                }}
                variant="outline"
              >
                Set Savings Goal
              </Button>
            </div>
          </Card>
        </div>

        <BudgetForm
          open={isBudgetFormOpen}
          onOpenChange={setIsBudgetFormOpen}
          onBudgetAdded={handleBudgetUpdate}
        />

        <MonthlyIncomeForm
          open={isIncomeFormOpen}
          onOpenChange={setIsIncomeFormOpen}
          onIncomeAdded={handleIncomeUpdate}
        />
      </div>
    </Layout>
  );
};

export default BudgetsPage;

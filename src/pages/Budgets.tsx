
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

const BudgetsPage = () => {
  const { currency } = useSettings();
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);

  const { data: budgetCategories, refetch: refetchBudgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("*")
        .order("category");
      if (error) throw error;
      return data;
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
    queryKey: ["transactions"],
    queryFn: async () => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("date", firstDay.toISOString())
        .lte("date", lastDay.toISOString()) as { data: Transaction[] | null; error: any };

      if (error) throw error;
      return data || [];
    },
  });

  const calculateSpending = (category: string) => {
    return transactions
      ?.filter((t) => t.category === category && t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  };

  const getBudgetAlerts = () => {
    if (!budgetCategories || !transactions) return [];
    
    return budgetCategories
      .map((budget) => {
        const spent = calculateSpending(budget.category);
        const percentage = (spent / budget.monthly_limit) * 100;
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
            {currency.symbol}{monthlyIncome?.amount?.toFixed(2) ?? "0.00"}
          </p>
        </Card>

        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Alert variant="destructive" key={alert.category}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Budget Alert</AlertTitle>
                <AlertDescription>
                  You've spent {currency.symbol}{alert.spent.toFixed(2)} of your {currency.symbol}{alert.limit.toFixed(2)} budget for {alert.category} ({alert.percentage.toFixed(1)}%)
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

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
            <h2 className="text-lg font-semibold mb-4">Budget Progress</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgetCategories?.map((budget) => (
                <BudgetCard
                  key={budget.id}
                  category={budget.category}
                  limit={budget.monthly_limit}
                  spent={calculateSpending(budget.category)}
                  currency={currency}
                  onBudgetUpdate={refetchBudgets}
                />
              ))}
            </div>
          </Card>
        </div>

        <BudgetForm
          open={isBudgetFormOpen}
          onOpenChange={setIsBudgetFormOpen}
          onBudgetAdded={refetchBudgets}
        />

        <MonthlyIncomeForm
          open={isIncomeFormOpen}
          onOpenChange={setIsIncomeFormOpen}
          onIncomeAdded={refetchIncome}
        />
      </div>
    </Layout>
  );
};

export default BudgetsPage;

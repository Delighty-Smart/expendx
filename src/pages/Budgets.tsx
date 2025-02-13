
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { PlusCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BudgetForm } from "@/components/BudgetForm";
import { BudgetChart } from "@/components/BudgetChart";
import { BudgetProgress } from "@/components/BudgetProgress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const BudgetsPage = () => {
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);

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
        .lte("date", lastDay.toISOString());

      if (error) throw error;
      return data;
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
          <Button
            className="flex items-center gap-2"
            onClick={() => setIsBudgetFormOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            Set Budget Limit
          </Button>
        </div>

        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Alert variant="destructive" key={alert.category}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Budget Alert</AlertTitle>
                <AlertDescription>
                  You've spent ${alert.spent.toFixed(2)} of your ${alert.limit.toFixed(2)} budget for {alert.category} ({alert.percentage.toFixed(1)}%)
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
            />
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Budget Progress</h2>
            <div className="space-y-4">
              {budgetCategories?.map((budget) => (
                <BudgetProgress
                  key={budget.id}
                  category={budget.category}
                  limit={budget.monthly_limit}
                  spent={calculateSpending(budget.category)}
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
      </div>
    </Layout>
  );
};

export default BudgetsPage;

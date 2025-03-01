
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { PlusCircle, AlertCircle, DollarSign, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BudgetForm } from "@/components/BudgetForm";
import { BudgetChart } from "@/components/BudgetChart";
import { BudgetCard } from "@/components/BudgetCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MonthlyIncomeForm } from "@/components/MonthlyIncomeForm";
import { useSettings } from "@/contexts/SettingsContext";
import { Transaction, TransactionType, TransactionCategory } from "@/types/transactions";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
  const [isSavingsDialogOpen, setIsSavingsDialogOpen] = useState(false);
  const [savingsGoal, setSavingsGoal] = useState(0);
  const [newSavingsGoal, setNewSavingsGoal] = useState("");
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

  // Convert data to the correct Transaction type with an explicit cast for the category
  const transactions: Transaction[] = (transactionsData || []).map(transaction => ({
    ...transaction,
    type: transaction.type as TransactionType,
    category: transaction.category as TransactionCategory
  }));

  // Set up real-time subscription to transactions table changes
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'transactions'
        },
        () => {
          // When changes are detected, refetch data
          console.log('Transaction data changed, refreshing...');
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
          queryClient.invalidateQueries({ queryKey: ["budgets"] });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch the savings goal from the budget categories
  useEffect(() => {
    if (budgetCategories) {
      const savingsBudget = budgetCategories.find(b => b.category === "Savings");
      if (savingsBudget) {
        setSavingsGoal(savingsBudget.monthly_limit);
      }
    }
  }, [budgetCategories]);

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

  const handleSavingsGoalSubmit = async () => {
    const goalAmount = parseFloat(newSavingsGoal);
    
    if (isNaN(goalAmount) || goalAmount <= 0) {
      return;
    }
    
    const savingsBudget = budgetCategories?.find(b => b.category === "Savings");
    
    try {
      if (savingsBudget) {
        // Update existing savings budget
        await supabase
          .from("budget_categories")
          .update({ monthly_limit: goalAmount })
          .eq("id", savingsBudget.id);
      } else {
        // Create new savings budget
        await supabase
          .from("budget_categories")
          .insert({ category: "Savings", monthly_limit: goalAmount });
      }
      
      // Refresh the budgets
      handleBudgetUpdate();
      setIsSavingsDialogOpen(false);
      setNewSavingsGoal("");
    } catch (error) {
      console.error("Error updating savings goal:", error);
    }
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

  // Calculate total monthly spending for all expense categories
  const totalMonthlySpending = transactions
    ?.filter(t => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0) || 0;

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {budgetCategories?.filter(budget => budget.category !== "Savings").map((budget) => (
              <BudgetCard
                key={budget.id}
                id={budget.id}
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
              <div className="relative w-48 h-48">
                <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-muted/20"
                  />
                  {/* Progress circle */}
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
              
              <Dialog open={isSavingsDialogOpen} onOpenChange={setIsSavingsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Set Savings Goal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Savings Goal</DialogTitle>
                    <DialogDescription>
                      Enter your monthly savings target. This will help track your progress.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="savingsGoal" className="text-right col-span-1">
                        Amount
                      </Label>
                      <div className="col-span-3 flex items-center gap-2">
                        <span>{currency.symbol}</span>
                        <Input
                          id="savingsGoal"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newSavingsGoal}
                          onChange={(e) => setNewSavingsGoal(e.target.value)}
                          className="col-span-3"
                          placeholder="Enter amount"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button onClick={handleSavingsGoalSubmit}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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

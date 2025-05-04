import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { PlusCircle, ArrowDownToLine, Wallet, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { Transaction, TransactionType, savingsCategories, SavingsGoal, TransactionCategory } from "@/types/transactions";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SavingsGoalForm } from "@/components/SavingsGoalForm";
import { SavingsWithdrawalForm } from "@/components/SavingsWithdrawalForm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

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

const SavingsPage = () => {
  const { currency } = useSettings();
  const { toast } = useToast();
  const [isSavingsGoalFormOpen, setSavingsGoalFormOpen] = useState(false);
  const [isWithdrawalFormOpen, setWithdrawalFormOpen] = useState(false);
  const queryClient = useQueryClient();

  const today = new Date();
  const firstDayOfMonth = startOfMonth(today).toISOString();
  const lastDayOfMonth = endOfMonth(today).toISOString();

  const { data: savingsGoals, refetch: refetchSavingsGoals } = useQuery({
    queryKey: ["savings_goals"],
    queryFn: async () => {
      try {
        // Use type assertion to bypass TypeScript errors
        const { data, error } = await supabase
          .from("savings_goals" as any)
          .select("*")
          .order("category");
          
        if (error) {
          console.error("Error fetching savings goals:", error);
          throw error;
        }
        
        return data as unknown as SavingsGoal[] || [];
      } catch (error) {
        console.error("Failed to fetch savings goals:", error);
        return [];
      }
    },
  });

  const { data: transactionsData } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      try {
        // Fetch all transactions, not just savings
        const { data, error } = await supabase
          .from("transactions")
          .select("*"); // Removed filter to get all transaction types

        if (error) {
          console.error("Error fetching transactions:", error);
          throw error;
        }
        
        console.log(`Fetched ${data?.length || 0} transactions of all types`);
        return data as TransactionData[] || [];
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        return [];
      }
    },
  });

  // Fixed: Properly cast transaction categories using `as TransactionCategory`
  const transactions: Transaction[] = (transactionsData || []).map(transaction => ({
    ...transaction,
    type: transaction.type as TransactionType,
    category: transaction.category as TransactionCategory // Explicit cast to TransactionCategory
  }));

  // Filter only savings transactions for this page
  const savingsTransactions = transactions.filter(t => t.type === "savings");

  const handleRealTimeUpdates = useCallback(() => {
    console.log('Data changed, refreshing...');
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["savings_goals"] });
  }, [queryClient]);

  useRealtimeSubscription('transactions', '*', handleRealTimeUpdates);
  useRealtimeSubscription('savings_goals', '*', handleRealTimeUpdates);

  const handleSavingsGoalUpdate = useCallback(() => {
    refetchSavingsGoals();
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }, [refetchSavingsGoals, queryClient]);

  const calculateSavingsByCategory = useCallback((category: string) => {
    if (!savingsTransactions) return 0;
    
    const savings = savingsTransactions
      .filter((t) => t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
      
    return savings;
  }, [savingsTransactions]);

  const calculateTotalSavings = useCallback(() => {
    if (!savingsTransactions) return 0;
    
    const savings = savingsTransactions.reduce((sum, t) => sum + t.amount, 0);
      
    return savings;
  }, [savingsTransactions]);

  const totalSavings = calculateTotalSavings();

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getSavingsProgress = (goal: SavingsGoal) => {
    const savedAmount = calculateSavingsByCategory(goal.category);
    return {
      current: savedAmount,
      target: goal.target_amount,
      percentage: goal.target_amount > 0 ? (savedAmount / goal.target_amount * 100) : 0
    };
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Savings</h1>
          <div className="flex flex-wrap gap-2">
            <Button
              className="flex items-center gap-2"
              onClick={() => setWithdrawalFormOpen(true)}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Withdraw
            </Button>
            <Button
              className="flex items-center gap-2"
              onClick={() => setSavingsGoalFormOpen(true)}
            >
              <PlusCircle className="h-4 w-4" />
              Set Savings Goal
            </Button>
          </div>
        </div>

        <Card className="p-4 glass-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
              <PiggyBank className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Savings</p>
              <p className="text-2xl font-semibold">{currency.symbol}{formatAmount(totalSavings)}</p>
            </div>
          </div>
        </Card>

        <ScrollArea className="h-[calc(100vh-320px)] transition-all duration-500 ease-in-out">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-6">
            {savingsGoals?.map((goal) => {
              const progress = getSavingsProgress(goal);
              return (
                <Card key={goal.id} className="p-4 glass-card hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{goal.category}</h3>
                    <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded-full">
                      {progress.percentage.toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Saved:</span>
                      <span className="font-medium">{currency.symbol}{formatAmount(progress.current)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Target:</span>
                      <span className="font-medium">{currency.symbol}{formatAmount(progress.target)}</span>
                    </div>
                    
                    <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-secondary rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        <SavingsGoalForm
          open={isSavingsGoalFormOpen}
          onOpenChange={setSavingsGoalFormOpen}
          onSavingsGoalAdded={handleSavingsGoalUpdate}
        />

        <SavingsWithdrawalForm
          open={isWithdrawalFormOpen}
          onOpenChange={setWithdrawalFormOpen}
          onWithdrawalComplete={handleSavingsGoalUpdate}
        />
      </div>
    </Layout>
  );
};

export default SavingsPage;

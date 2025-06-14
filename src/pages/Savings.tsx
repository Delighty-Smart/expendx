
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, GlassCard } from "@/components/ui/card";
import { PlusCircle, ArrowDownToLine, PiggyBank, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { SavingsGoal } from "@/types/transactions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useTransactionData } from "@/hooks/useTransactionData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SavingsGoalForm } from "@/components/SavingsGoalForm";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRefresh } from "@/hooks/useRefresh";

const SavingsPage = () => {
  const { currency } = useSettings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshData } = useRefresh();

  // State for modals and editing
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<SavingsGoal | null>(null);

  // Use our custom hook to fetch transactions of type "savings"
  const { transactions: savingsTransactions } = useTransactionData({ 
    type: "savings" 
  });

  // Fetch savings goals separately
  const { data: savingsGoals } = useQuery({
    queryKey: ["savings_goals"],
    queryFn: async () => {
      // Use type assertion to bypass TypeScript errors
      const { data, error } = await supabase
        .from("savings_goals" as any)
        .select("*")
        .order("category");
      if (error) throw error;
      return data as unknown as SavingsGoal[] || [];
    },
  });

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

  const handleEditGoal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
  };

  const handleDeleteGoal = async (goal: SavingsGoal) => {
    try {
      const { error } = await supabase
        .from("savings_goals" as any)
        .delete()
        .eq("id", goal.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Savings goal deleted successfully"
      });

      queryClient.invalidateQueries({ queryKey: ["savings_goals"] });
      setDeletingGoal(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleGoalSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["savings_goals"] });
    setEditingGoal(null);
    setIsAddGoalOpen(false);
  };

  return (
    <Layout>
      <PullToRefresh onRefresh={refreshData} containerClassName="h-full">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold">Savings</h1>
            <div className="flex flex-wrap gap-2">
              <Button
                className="flex items-center gap-2"
                onClick={() => navigate("/savings-withdrawal")}
              >
                <ArrowDownToLine className="h-4 w-4" />
                Withdraw
              </Button>
              <Button
                className="flex items-center gap-2"
                onClick={() => setIsAddGoalOpen(true)}
              >
                <PlusCircle className="h-4 w-4" />
                Set Savings Goal
              </Button>
            </div>
          </div>

          <GlassCard className="p-6 bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-teal-50/40 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-teal-950/10 border-green-200/30 dark:border-green-800/30">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 flex items-center justify-center shadow-lg">
                <PiggyBank className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Savings</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  {currency.symbol}{formatAmount(totalSavings)}
                </p>
              </div>
            </div>
          </GlassCard>

          <ScrollArea className="h-[calc(100vh-320px)] transition-all duration-500 ease-in-out overflow-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-6">
              {savingsGoals?.map((goal) => {
                const progress = getSavingsProgress(goal);
                return (
                  <GlassCard key={goal.id} className="p-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-white/80 via-blue-50/40 to-purple-50/20 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-600/20 border-blue-200/30 dark:border-slate-600/30">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-foreground">{goal.category}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded-full font-medium">
                          {progress.percentage.toFixed(0)}%
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-slate-700"
                            onClick={() => handleEditGoal(goal)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => setDeletingGoal(goal)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-medium">Saved:</span>
                        <span className="font-semibold text-foreground">{currency.symbol}{formatAmount(progress.current)}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-medium">Target:</span>
                        <span className="font-semibold text-foreground">{currency.symbol}{formatAmount(progress.target)}</span>
                      </div>
                      
                      <div className="h-2 w-full bg-slate-200/60 dark:bg-slate-700/60 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </ScrollArea>

          {/* Add/Edit Savings Goal Modal */}
          <SavingsGoalForm
            open={isAddGoalOpen || !!editingGoal}
            onOpenChange={(open) => {
              if (!open) {
                setIsAddGoalOpen(false);
                setEditingGoal(null);
              }
            }}
            onSavingsGoalAdded={handleGoalSaved}
            savingsGoalId={editingGoal?.id}
          />

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!deletingGoal} onOpenChange={() => setDeletingGoal(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Savings Goal</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the savings goal for "{deletingGoal?.category}"? 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deletingGoal && handleDeleteGoal(deletingGoal)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PullToRefresh>
    </Layout>
  );
};

export default SavingsPage;


import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
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
        .order("created_at", { ascending: false });
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

          <ScrollArea className="h-[calc(100vh-320px)] transition-all duration-500 ease-in-out overflow-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-6">
              {savingsGoals?.map((goal) => {
                const progress = getSavingsProgress(goal);
                return (
                  <Card key={goal.id} className="p-4 glass-card hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{goal.category}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded-full">
                          {progress.percentage.toFixed(0)}%
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditGoal(goal)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeletingGoal(goal)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
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


import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useSettings } from "@/contexts/SettingsContext";
import { SavingsGoal } from "@/types/transactions";
import { useToast } from "@/hooks/use-toast";
import { useTransactionData } from "@/hooks/useTransactionData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SavingsGoalForm } from "@/components/SavingsGoalForm";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRefresh } from "@/hooks/useRefresh";
import { SavingsHeader } from "@/components/savings/SavingsHeader";
import { SavingsTotalCard } from "@/components/savings/SavingsTotalCard";
import { SavingsGoalsList } from "@/components/savings/SavingsGoalsList";

const SavingsPage = () => {
  const { currency } = useSettings();
  const { toast } = useToast();
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
      return (data as unknown as SavingsGoal[]) || [];
    }
  });

  const calculateSavingsByCategory = useCallback((category: string) => {
    if (!savingsTransactions) return 0;
    const savings = savingsTransactions
      .filter(t => t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
    return savings;
  }, [savingsTransactions]);

  const calculateTotalSavings = useCallback(() => {
    if (!savingsTransactions) return 0;
    const savings = savingsTransactions.reduce((sum, t) => sum + t.amount, 0);
    return savings;
  }, [savingsTransactions]);

  const totalSavings = calculateTotalSavings();

  const getSavingsProgress = (goal: SavingsGoal) => {
    const savedAmount = calculateSavingsByCategory(goal.category);
    return {
      current: savedAmount,
      target: goal.target_amount,
      percentage: goal.target_amount > 0 ? (savedAmount / goal.target_amount) * 100 : 0
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
          <SavingsHeader onAddGoalClick={() => setIsAddGoalOpen(true)} />

          <SavingsTotalCard totalSavings={totalSavings} currency={currency} />

          <SavingsGoalsList
            savingsGoals={savingsGoals}
            getSavingsProgress={getSavingsProgress}
            currency={currency}
            onEditGoal={handleEditGoal}
            onDeleteGoal={setDeletingGoal}
          />

          {/* Add/Edit Savings Goal Modal */}
          <SavingsGoalForm 
            open={isAddGoalOpen || !!editingGoal} 
            onOpenChange={open => {
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

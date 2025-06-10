
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, TrendingUp } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BudgetProgress } from "@/components/BudgetProgress";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRefresh } from "@/hooks/useRefresh";

interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
  user_id: string;
}

const BudgetCard = ({ budget, onEdit, onDelete }: { budget: Budget; onEdit: (budget: Budget) => void; onDelete: (budget: Budget) => void }) => {
  const { currency } = useSettings();

  // Query to get current month spending for this category
  const { data: currentSpending = 0 } = useQuery({
    queryKey: ['category-spending', budget.category],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('category', budget.category)
        .eq('type', 'debit')
        .eq('archived', false)
        .gte('date', firstDay)
        .lte('date', lastDay);

      if (error) throw error;
      return data?.reduce((sum, t) => sum + t.amount, 0) || 0;
    },
  });

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <Card className="p-4 glass-card hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium">{budget.category}</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onEdit(budget)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(budget)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Budget:</span>
          <span className="font-medium">{currency.symbol}{formatAmount(budget.monthly_limit)}</span>
        </div>
        <BudgetProgress 
          category={budget.category} 
          limit={budget.monthly_limit} 
          spent={currentSpending}
          currency={currency}
        />
      </div>
    </Card>
  );
};

const BudgetsPage = () => {
  const [open, setOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currency } = useSettings();
  const { toast } = useToast();
  const { refreshData } = useRefresh();

  const { data: budgets, isLoading, isError } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .order('category');

      if (error) {
        throw new Error(error.message);
      }

      return data as Budget[];
    },
  });

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleDeleteBudget = useCallback(async () => {
    if (!budgetToDelete) return;

    try {
      const { error } = await supabase
        .from('budget_categories')
        .delete()
        .eq('id', budgetToDelete.id);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Success",
        description: "Budget deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setOpen(false);
      setBudgetToDelete(null);
    }
  }, [budgetToDelete, queryClient, toast]);

  const confirmDeleteBudget = (budget: Budget) => {
    setBudgetToDelete(budget);
    setOpen(true);
  };

  const handleEditBudget = (budget: Budget) => {
    navigate(`/edit-budget?id=${budget.id}`);
  };

  if (isLoading) {
    return <Layout><div>Loading budgets...</div></Layout>;
  }

  if (isError) {
    return <Layout><div>Error loading budgets.</div></Layout>;
  }

  return (
    <Layout>
      <PullToRefresh onRefresh={refreshData} containerClassName="h-full">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Budgets</h1>
            <Button onClick={() => navigate('/add-budget')} className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Budget
            </Button>
          </div>

          <Card className="p-4 glass-card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-semibold">
                  {currency.symbol}
                  {formatAmount(budgets?.reduce((sum, budget) => sum + budget.monthly_limit, 0) || 0)}
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {budgets?.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onEdit={handleEditBudget}
                onDelete={confirmDeleteBudget}
              />
            ))}
          </div>

          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Budget</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this budget? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setBudgetToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteBudget} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

export default BudgetsPage;


import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, GlassCard } from "@/components/ui/card";

import { startOfMonth, endOfMonth, format } from "date-fns";
import { useCategories } from "@/hooks/useCategories";
import { useTransactionData } from "@/hooks/useTransactionData";

import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/page-header";
import { PlusCircle, Edit, Trash2, TrendingUp } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BudgetProgress } from "@/components/BudgetProgress";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRefresh } from "@/hooks/useRefresh";
import { useAuth } from "@/hooks/useAuth";

interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
  user_id: string;
}

const BudgetCard = ({ budget, onEdit, onDelete }: { budget: Budget; onEdit: (budget: Budget) => void; onDelete: (budget: Budget) => void }) => {
  const { currency } = useSettings();

  const now = new Date();

  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const { categories: expenseCategories } = useCategories('debit');

  const { user } = useAuth();
  const { data: currentSpending = 0 } = useQuery({
    queryKey: ['category-spending', budget.category, user?.id, monthKey],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return 0;

      const firstDay = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      const lastDay = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');

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

    <GlassCard className="p-4 hover:scale-[1.02] bg-gradient-to-br from-white/80 via-orange-50/40 to-red-50/20 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-600/20 border-orange-200/30 dark:border-slate-600/30 transition-all duration-300">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg text-foreground">{budget.category}</h3>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-orange-100 dark:hover:bg-slate-700"
            onClick={() => onEdit(budget)}
          >

            <Edit className="h-4 w-4" />

          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={() => onDelete(budget)}
          >

            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground font-medium">Budget:</span>
          <span className="font-bold text-lg text-foreground">{currency.symbol}{formatAmount(budget.monthly_limit)}</span>
        </div>
        <BudgetProgress
          category={budget.category}
          limit={budget.monthly_limit}

          spent={currentSpending}
          currency={currency}
        />
      </div>
    </GlassCard>
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
  const { user } = useAuth();
  const { transactions } = useTransactionData({
    type: 'debit',
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const { data: budgets, isLoading, isError } = useQuery({
    queryKey: ['budgets', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [] as Budget[];
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('user_id', user.id)
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
    navigate('/edit-budget', { state: { budget } });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="h-8 bg-muted rounded animate-skeleton-pulse w-32"></div>
          <div className="h-10 bg-muted rounded animate-skeleton-pulse w-28"></div>
        </div>



        <div className="animate-skeleton-pulse">
          <div className="p-6 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-muted"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-8 bg-muted rounded w-32"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-skeleton-pulse">
              <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
                <div className="flex justify-between items-start">
                  <div className="h-6 bg-muted rounded w-24"></div>
                  <div className="flex gap-1">
                    <div className="h-8 w-8 bg-muted rounded"></div>
                    <div className="h-8 w-8 bg-muted rounded"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <div className="h-4 bg-muted rounded w-16"></div>
                    <div className="h-4 bg-muted rounded w-20"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 bg-muted rounded w-12"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                    <div className="h-2 bg-muted rounded w-full"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return <div>Error loading budgets.</div>;
  }

  return (
    <PullToRefresh onRefresh={refreshData} containerClassName="h-full">

      <div className="space-y-6 pb-24">

        <PageHeader
          title="Budgets"
          actions={
            <Button onClick={() => navigate('/add-budget')} className="flex items-center gap-2 flex-none whitespace-nowrap">
              <PlusCircle className="h-4 w-4" />
              Add Budget
            </Button>
          }
        />

        <GlassCard className="p-6 bg-gradient-to-br from-orange-50/80 via-amber-50/60 to-yellow-50/40 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-yellow-950/10 border-orange-200/30 dark:border-orange-800/30">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 dark:from-orange-400 dark:to-amber-500 flex items-center justify-center shadow-lg">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Budget</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent">
                {currency.symbol}
                {formatAmount(budgets?.reduce((sum, budget) => sum + budget.monthly_limit, 0) || 0)}
              </p>
            </div>
          </div>
        </GlassCard>

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
  );
};

export default BudgetsPage;



import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, GlassCard } from "@/components/ui/card";

import { startOfMonth, endOfMonth, format } from "date-fns";
import { useCategories } from "@/hooks/useCategories";
import { useTransactionData } from "@/hooks/useTransactionData";

import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/page-header";
import { PlusCircle, Edit, Trash2, TrendingUp, DollarSign, MoreVertical } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BudgetProgress } from "@/components/BudgetProgress";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRefresh } from "@/hooks/useRefresh";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
  user_id: string;
}

const BudgetCard = ({ budget, onEdit, onDelete }: { budget: Budget; onEdit: (budget: Budget) => void; onDelete: (budget: Budget) => void }) => {
  const { currency, formatValue } = useSettings();

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

  return (
    <Card className="p-4 relative group overflow-hidden transition-colors duration-200 rounded-[16px] border border-border-default bg-bg-card hover:bg-bg-card-hover shadow-[var(--elevation-1)]">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-text-primary text-sm font-semibold">
            {budget.category.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-base text-text-heading leading-snug">{budget.category}</h3>
            <span className="text-xs text-text-tertiary">Monthly limit</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-bg-sidebar-hover text-text-secondary transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 rounded-[12px] bg-bg-surface border border-border-default shadow-lg p-1">
            <DropdownMenuItem
              onClick={() => onEdit(budget)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-primary hover:bg-bg-sidebar-hover rounded-[8px] cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5 text-text-secondary" />
              <span>Edit</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(budget)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-semantic-danger-text hover:bg-semantic-danger-bg rounded-[8px] cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 text-semantic-danger-text" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-2">
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
  const { currency, formatValue } = useSettings();
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
              <div className="w-16 h-16 rounded-lg bg-muted"></div>
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
          backTo="/dashboard"
          actions={
            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/set-income')} variant="outline" size="compact" className="flex items-center gap-1.5 flex-none whitespace-nowrap text-xs">
                <DollarSign className="h-3.5 w-3.5" />
                Set Income
              </Button>
              <Button onClick={() => navigate('/add-budget')} size="compact" className="flex items-center gap-1.5 flex-none whitespace-nowrap text-xs">
                <PlusCircle className="h-3.5 w-3.5" />
                Add Budget
              </Button>
            </div>
          }
        />

        <Card className="p-4 px-5">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-brand-primary-subtle flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6 text-text-primary" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-wider leading-none">Total Budget</span>
              <span className="text-2xl font-extrabold text-text-primary font-numeric font-amount mt-1 leading-none primary-total-amount">
                {formatValue(budgets?.reduce((sum, budget) => sum + budget.monthly_limit, 0) || 0)}
              </span>
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
  );
};

export default BudgetsPage;


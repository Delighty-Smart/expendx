
import { useState } from "react";
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface BudgetCardProps {
  id: string;
  category: string;
  limit: number;
  spent: number; // This should be calculated from unarchived transactions only
  currency: {
    code: string;
    symbol: string;
  };
  onEditClick?: () => void;
}

export function BudgetCard({
  id,
  category,
  limit,
  spent,
  currency,
  onEditClick,
}: BudgetCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const percentage = Math.min((spent / limit) * 100, 100);
  const isOverBudget = spent > limit;
  const diffAmount = Math.abs(limit - spent);

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleDeleteBudget = async () => {
    try {
      setIsDeleting(true);

      // Delete the budget from the database
      const { error } = await supabase
        .from("budget_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Budget Deleted",
        description: `Budget for ${category} has been removed`,
      });

      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <GlassCard className={`relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-white/80 via-blue-50/40 to-indigo-50/20 dark:from-slate-800/50 dark:via-slate-800/30 dark:to-slate-900/20 border-blue-200/30 dark:border-slate-800/30 ${isOverBudget ? 'border-rose-500/50' : ''}`}>
      {isOverBudget && (
        <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-bl-lg">
          Over Budget
        </div>
      )}
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground text-sm truncate w-36">{category}</h3>
            <p className="text-lg font-bold">
              {currency.symbol}{formatAmount(spent)}
              <span className="text-xs text-muted-foreground ml-1 font-medium">
                / {currency.symbol}{formatAmount(limit)}
              </span>
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 p-0 hover:bg-blue-100 dark:hover:bg-slate-700 touch-manipulation md:h-8 md:w-8"
              onClick={onEditClick}
            >
              <Edit className="h-5 w-5 md:h-4 md:w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 touch-manipulation md:h-8 md:w-8"
              onClick={handleDeleteBudget}
              disabled={isDeleting}
            >
              <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Progress
            value={percentage}
            className="h-2"
            indicatorClassName={isOverBudget ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}
          />
          <div className="flex justify-between text-xs">
            <p className="text-muted-foreground font-medium">
              {percentage.toFixed(0)}% used (Active only)
            </p>
            <p className={`font-medium ${isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
              {isOverBudget ? 'Over by ' : 'Remaining '}
              {currency.symbol}{formatAmount(diffAmount)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground italic">
            Calculations based on unarchived transactions only
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

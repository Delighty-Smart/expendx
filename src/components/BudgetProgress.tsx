
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BudgetProgressProps {
  category: string;
  limit: number;
  spent: number;
  currency: {
    code: string;
    symbol: string;
    name: string;
  };
}

export function BudgetProgress({ category, limit, spent, currency }: BudgetProgressProps) {
  const percentage = Math.min((spent / limit) * 100, 100);

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-rose-500";
    if (percent >= 75) return "bg-amber-500";
    return "bg-primary";
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getStatusMessage = (percent: number) => {
    if (percent >= 100) return "Budget exceeded!";
    if (percent >= 90) return "Almost at limit";
    if (percent >= 75) return "Watch your spending";
    return "On track";
  };

  const getStatusIcon = (percent: number) => {
    if (percent >= 90) return "⚠️";
    if (percent >= 75) return "⚡";
    return "✓";
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex justify-between items-center text-sm">
        <span className="text-xs text-muted-foreground font-medium">
          {currency.symbol}{formatAmount(spent)} / {currency.symbol}{formatAmount(limit)}
        </span>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full transition-all duration-300 ${percentage >= 90
          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
          : percentage >= 75
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          }`}>
          {getStatusIcon(percentage)} {getStatusMessage(percentage)}
        </span>
      </div>
      <div className="relative">
        <Progress
          value={percentage}
          className="h-3 transition-all duration-500"
          indicatorClassName={`${getProgressColor(percentage)} transition-all duration-500`}
        />
        {percentage >= 90 && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        )}
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">
          {spent > limit
            ? `${((spent / limit) * 100 - 100).toFixed(1)}% exceeded (${((spent / limit) * 100).toFixed(1)}% of budget)`
            : `${((spent / limit) * 100).toFixed(1)}% used`}
        </span>
        <span className={`font-medium transition-colors duration-300 ${percentage >= 90
          ? "text-rose-600 dark:text-rose-400"
          : "text-muted-foreground"
          }`}>
          {spent > limit ? 'Over by ' : ''}
          {currency.symbol}{formatAmount(Math.abs(limit - spent))}
          {spent <= limit ? ' remaining' : ''}
        </span>
      </div>
    </div>
  );
}

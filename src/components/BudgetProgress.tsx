
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
    if (percent >= 90) return "bg-red-500";
    if (percent >= 75) return "bg-yellow-500";
    return "bg-primary";
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-xs text-muted-foreground">
          {currency.symbol}{formatAmount(spent)} / {currency.symbol}{formatAmount(limit)}
        </span>
      </div>
      <Progress
        value={percentage}
        className="h-2"
        indicatorClassName={getProgressColor(percentage)}
      />
      <div className="text-xs text-muted-foreground">
        {percentage.toFixed(1)}% used (Active transactions only)
      </div>
    </div>
  );
}

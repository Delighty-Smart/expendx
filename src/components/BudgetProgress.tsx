
import { Progress } from "@/components/ui/progress";
import { Currency } from "@/lib/currencies";

interface BudgetProgressProps {
  category: string;
  limit: number;
  spent: number;
  currency: Currency;
}

export function BudgetProgress({ category, limit, spent, currency }: BudgetProgressProps) {
  const percentage = Math.min((spent / limit) * 100, 100);
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 75) return "bg-yellow-500";
    return "bg-primary";
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{category}</span>
        <span>
          {currency.symbol}{spent.toFixed(2)} / {currency.symbol}{limit.toFixed(2)}
        </span>
      </div>
      <Progress
        value={percentage}
        className="h-2"
        indicatorClassName={getProgressColor(percentage)}
      />
    </div>
  );
}

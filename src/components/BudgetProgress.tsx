
import { Progress } from "@/components/ui/progress";

interface BudgetProgressProps {
  category: string;
  limit: number;
  spent: number;
}

export function BudgetProgress({ category, limit, spent }: BudgetProgressProps) {
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
          ${spent.toFixed(2)} / ${limit.toFixed(2)}
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

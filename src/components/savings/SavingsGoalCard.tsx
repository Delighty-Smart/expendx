
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { SavingsGoal } from "@/types/transactions";

interface SavingsGoalCardProps {
  goal: SavingsGoal;
  progress: {
    current: number;
    target: number;
    percentage: number;
  };
  currency: {
    symbol: string;
  };
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goal: SavingsGoal) => void;
}


export function SavingsGoalCard({
  goal,
  progress,
  currency,
  onEdit,
  onDelete

}: SavingsGoalCardProps) {
  const isOverTarget = progress.current > progress.target;

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (

    <GlassCard className="p-4 relative group overflow-hidden transition-all duration-300 hover:shadow-lg border-l-4 border-l-primary/50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            {goal.category}
          </h3>
          <p className="text-sm text-muted-foreground">
            {currency.symbol}{formatAmount(progress.current)} / {currency.symbol}{formatAmount(goal.target_amount)}
          </p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            onClick={() => onEdit(goal)}
          >
            <Edit className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(goal)}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-2 w-full bg-slate-200/60 dark:bg-slate-700/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${isOverTarget ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-primary to-blue-600'}`}
            style={{ width: `${Math.min(progress.percentage, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs">
          <p className="text-muted-foreground font-medium">
            {progress.percentage.toFixed(0)}% achieved
          </p>
          <p className={`font-medium ${isOverTarget ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
            {isOverTarget ? 'Over by ' : 'Remaining '}
            {currency.symbol}{formatAmount(Math.abs(progress.target - progress.current))}
          </p>

        </div>
      </div>
    </GlassCard>
  );
}


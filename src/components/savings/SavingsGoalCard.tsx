
import { GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { SavingsGoal } from "@/types/transactions";
import { CircularProgress } from "@/components/ui/circular-progress";
import { cn } from "@/lib/utils";

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
    <GlassCard className="p-5 relative group overflow-hidden transition-all duration-300 hover:shadow-lg border border-border/45 hover:border-primary/20 flex gap-5 items-center">
      <CircularProgress
        value={progress.percentage}
        size={72}
        strokeWidth={7}
        ringColor={isOverTarget ? "text-emerald-500" : "text-primary"}
        glow={true}
        className="flex-shrink-0"
      >
        <span className="text-[14px] font-extrabold tracking-tight font-numeric">
          {Math.min(progress.percentage, 100).toFixed(0)}%
        </span>
      </CircularProgress>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-lg leading-tight tracking-tight truncate text-foreground">
              {goal.category}
            </h3>
            <p className="text-sm font-semibold text-muted-foreground mt-1 font-numeric">
              {currency.symbol}{formatAmount(progress.current)} <span className="text-[10px] text-muted-foreground/50 font-normal">of</span> {currency.symbol}{formatAmount(goal.target_amount)}
            </p>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-full transition-colors"
              onClick={() => onEdit(goal)}
            >
              <Edit className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
              onClick={() => onDelete(goal)}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex justify-between text-xs items-center">
          <span className="text-muted-foreground/70 font-medium">
            {progress.percentage.toFixed(0)}% achieved
          </span>
          <span className={cn(
            "font-semibold font-numeric",
            isOverTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
          )}>
            {isOverTarget ? 'Over by ' : 'Remaining '}
            {currency.symbol}{formatAmount(Math.abs(progress.target - progress.current))}
          </span>
        </div>
      </div>
    </GlassCard>
  );
}



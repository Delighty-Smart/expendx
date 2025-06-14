
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
    <GlassCard 
      className={`relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-white/80 via-green-50/40 to-emerald-50/20 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-600/20 border-green-200/30 dark:border-slate-600/30 ${isOverTarget ? 'border-green-500/50' : ''}`}
    >
      {isOverTarget && (
        <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded-bl-lg">
          Target Exceeded!
        </div>
      )}
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground text-sm truncate w-36">{goal.category}</h3>
            <p className="text-lg font-bold">
              {currency.symbol}{formatAmount(progress.current)}
              <span className="text-xs text-muted-foreground ml-1 font-medium">
                / {currency.symbol}{formatAmount(progress.target)}
              </span>
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-slate-700" 
              onClick={() => onEdit(goal)}
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20" 
              onClick={() => onDelete(goal)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-2 w-full bg-slate-200/60 dark:bg-slate-700/60 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ease-out ${isOverTarget ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-green-500 to-emerald-600'}`}
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
      </div>
    </GlassCard>
  );
}

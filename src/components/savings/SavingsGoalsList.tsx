
import { ScrollArea } from "@/components/ui/scroll-area";
import { SavingsGoalCard } from "./SavingsGoalCard";
import { SavingsGoal } from "@/types/transactions";

interface SavingsGoalsListProps {
  savingsGoals: SavingsGoal[] | undefined;
  getSavingsProgress: (goal: SavingsGoal) => {
    current: number;
    target: number;
    percentage: number;
  };
  currency: {
    symbol: string;
  };
  onEditGoal: (goal: SavingsGoal) => void;
  onDeleteGoal: (goal: SavingsGoal) => void;
}

export function SavingsGoalsList({ 
  savingsGoals, 
  getSavingsProgress, 
  currency, 
  onEditGoal, 
  onDeleteGoal 
}: SavingsGoalsListProps) {
  return (
    <ScrollArea className="h-[calc(100vh-320px)] transition-all duration-500 ease-in-out overflow-auto pr-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-6">
        {savingsGoals?.map(goal => {
          const progress = getSavingsProgress(goal);
          return (
            <SavingsGoalCard
              key={goal.id}
              goal={goal}
              progress={progress}
              currency={currency}
              onEdit={onEditGoal}
              onDelete={onDeleteGoal}
            />
          );
        })}
      </div>
    </ScrollArea>
  );
}

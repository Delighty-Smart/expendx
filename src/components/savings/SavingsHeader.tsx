
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowDownToLine } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SavingsHeaderProps {
  onAddGoalClick: () => void;
}

export function SavingsHeader({ onAddGoalClick }: SavingsHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h1 className="text-2xl font-bold">Savings</h1>
      <div className="flex flex-wrap gap-2">
        <Button 
          size="compact"
          className="flex items-center gap-2 touch-manipulation" 
          onClick={() => navigate("/savings-withdrawal")}
        >
          <ArrowDownToLine className="mobile-icon-sm" />
          <span className="hidden sm:inline">Withdraw</span>
          <span className="sm:hidden">Withdraw</span>
        </Button>
        <Button 
          size="compact"
          className="flex items-center gap-2 touch-manipulation" 
          onClick={onAddGoalClick}
        >
          <PlusCircle className="mobile-icon-sm" />
          <span className="hidden sm:inline">Set Savings Goal</span>
          <span className="sm:hidden">Add Goal</span>
        </Button>
      </div>
    </div>
  );
}


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
          className="flex items-center gap-2" 
          onClick={() => navigate("/savings-withdrawal")}
        >
          <ArrowDownToLine className="h-4 w-4" />
          Withdraw
        </Button>
        <Button 
          className="flex items-center gap-2" 
          onClick={onAddGoalClick}
        >
          <PlusCircle className="h-4 w-4" />
          Set Savings Goal
        </Button>
      </div>
    </div>
  );
}

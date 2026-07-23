
import { Button } from "@/components/ui/button";
import { Plus, ArrowDownToLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";

interface SavingsHeaderProps {
  onAddGoalClick: () => void;
}

export function SavingsHeader({ onAddGoalClick }: SavingsHeaderProps) {
  const navigate = useNavigate();

  return (
    <PageHeader
      title="Savings"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            size="compact"
            className="flex items-center gap-2 touch-manipulation"
            onClick={() => navigate("/savings-withdrawal")}
          >
            <ArrowDownToLine className="h-4 w-4" strokeWidth={1.5} />
            Withdraw
          </Button>
          <Button
            size="compact"
            className="flex items-center gap-2 touch-manipulation"
            onClick={onAddGoalClick}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Set Savings Goal</span>
            <span className="sm:hidden">Add Goal</span>
          </Button>
        </div>
      }
    />
  );
}

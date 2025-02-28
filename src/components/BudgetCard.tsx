
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, MoreVertical } from "lucide-react";
import { BudgetForm } from "@/components/BudgetForm";

interface BudgetCardProps {
  category: string;
  limit: number;
  spent: number;
  currency: {
    code: string;
    symbol: string;
  };
  onBudgetUpdate: () => void;
}

export function BudgetCard({ category, limit, spent, currency, onBudgetUpdate }: BudgetCardProps) {
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  
  // Calculate the percentage
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  
  // Color based on percentage
  const getColor = () => {
    if (percentage >= 90) return "text-red-500";
    if (percentage >= 75) return "text-amber-500";
    return "text-green-500";
  };

  // Format currency
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <>
      <Card className="p-4 relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-sm">{category}</h3>
            <p className="text-lg font-semibold mt-1">
              {currency.symbol}{formatAmount(spent)} <span className="text-sm text-muted-foreground">of {currency.symbol}{formatAmount(limit)}</span>
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsBudgetFormOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Budget
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-3">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${getColor()} transition-all duration-500 ease-in-out`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span className={getColor()}>{percentage.toFixed(0)}%</span>
            <span>{Math.max(0, limit - spent).toLocaleString('en-US', { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} remaining</span>
          </div>
        </div>
      </Card>

      <BudgetForm
        open={isBudgetFormOpen}
        onOpenChange={setIsBudgetFormOpen}
        onBudgetAdded={onBudgetUpdate}
        existingCategory={category}
        existingLimit={limit}
      />
    </>
  );
}

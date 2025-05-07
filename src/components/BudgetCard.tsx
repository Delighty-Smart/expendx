
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface BudgetCardProps {
  id: string;
  category: string;
  limit: number;
  spent: number;
  currency: {
    code: string;
    symbol: string;
  };
  onEditClick?: () => void;
}

export function BudgetCard({
  id,
  category,
  limit,
  spent,
  currency,
  onEditClick,
}: BudgetCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const percentage = Math.min((spent / limit) * 100, 100);
  const remaining = Math.max(limit - spent, 0);
  const isOverBudget = spent > limit;

  const handleDeleteBudget = async () => {
    try {
      setIsDeleting(true);

      // Delete the budget from the database
      const { error } = await supabase
        .from("budget_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Budget Deleted",
        description: `Budget for ${category} has been removed`,
      });

      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className={`relative overflow-hidden hover:shadow-md transition-shadow ${isOverBudget ? 'border-destructive' : ''}`}>
      {isOverBudget && (
        <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-bl">
          Over Budget
        </div>
      )}
      <CardContent className="pt-6 pb-4">
        <div className="flex justify-between items-start mb-2">
          <div className="space-y-1">
            <h3 className="font-medium text-sm truncate w-36">{category}</h3>
            <p className="text-lg font-bold">
              {currency.symbol}
              {spent.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              <span className="text-xs text-muted-foreground ml-1">
                / {currency.symbol}
                {limit.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={onEditClick}
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive"
              onClick={handleDeleteBudget}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Progress 
            value={percentage} 
            className="h-2" 
            indicatorClassName={isOverBudget ? 'bg-destructive' : undefined} 
          />
          <div className="flex justify-between text-xs">
            <p className="text-muted-foreground">
              {percentage.toFixed(0)}% used
            </p>
            <p className={`${isOverBudget ? 'text-destructive' : 'text-muted-foreground'}`}>
              {isOverBudget ? 'Over by ' : 'Remaining '}
              {currency.symbol}
              {remaining.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


import { Card } from "@/components/ui/card";
import { Phone, Zap, ShoppingCart, Wifi, Gift, Coffee, Church, Droplets, Receipt, Film, MoreHorizontal, PiggyBank, Edit, Trash } from "lucide-react";
import { Currency } from "@/lib/currencies";
import { BudgetForm } from "@/components/BudgetForm";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface BudgetCardProps {
  category: string;
  limit: number;
  spent: number;
  currency: Currency;
  onBudgetUpdate: () => void;
  id?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  Airtime: <Phone className="w-5 h-5" />,
  Electricity: <Zap className="w-5 h-5" />,
  Food: <ShoppingCart className="w-5 h-5" />,
  Internet: <Wifi className="w-5 h-5" />,
  Gifts: <Gift className="w-5 h-5" />,
  Refreshments: <Coffee className="w-5 h-5" />,
  Offerings: <Church className="w-5 h-5" />,
  Toiletries: <Droplets className="w-5 h-5" />,
  Taxes: <Receipt className="w-5 h-5" />,
  Entertainment: <Film className="w-5 h-5" />,
  Other: <MoreHorizontal className="w-5 h-5" />,
  Savings: <PiggyBank className="w-5 h-5" />,
};

export function BudgetCard({ category, limit, spent, currency, onBudgetUpdate, id }: BudgetCardProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();
  
  const percentage = Math.min((spent / limit) * 100, 100);
  const remaining = Math.max(limit - spent, 0);
  
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500"; // danger
    if (percent >= 75) return "bg-amber-500"; // warning
    return "bg-primary"; // normal
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from("budget_categories")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
      
      toast({
        title: "Budget deleted",
        description: `${category} budget has been removed`,
      });
      
      onBudgetUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="p-4 hover:shadow-md transition-all duration-300 bg-card">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              {categoryIcons[category] || categoryIcons.Other}
            </div>
            <h3 className="font-medium text-base">{category}</h3>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsFormOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-muted h-2 rounded-full mb-3 mt-2">
          <div 
            className={`h-2 rounded-full ${getProgressColor(percentage)}`} 
            style={{ width: `${percentage}%`, transition: 'width 0.5s ease-out' }}
          />
        </div>
        
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Spent</p>
            <p className="font-medium">{currency.symbol}{spent.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Budget</p>
            <p className="font-medium">{currency.symbol}{limit.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-2 text-center">
          <p className="text-xs inline-block px-2 py-1 rounded-full bg-muted/50">
            {currency.symbol}{remaining.toFixed(2)} remaining ({percentage.toFixed(0)}%)
          </p>
        </div>
      </Card>

      <BudgetForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onBudgetAdded={onBudgetUpdate}
        initialCategory={category}
        budgetId={id}
      />
    </>
  );
}


import { Card } from "@/components/ui/card";
import { Phone, Zap, ShoppingCart, Wifi, Gift, Coffee, Church, Droplets, Receipt, Film, MoreHorizontal } from "lucide-react";
import { Currency } from "@/lib/currencies";
import { BudgetForm } from "@/components/BudgetForm";
import { useState } from "react";

interface BudgetCardProps {
  category: string;
  limit: number;
  spent: number;
  currency: Currency;
  onBudgetUpdate: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  Airtime: <Phone className="w-6 h-6" />,
  Electricity: <Zap className="w-6 h-6" />,
  Food: <ShoppingCart className="w-6 h-6" />,
  Internet: <Wifi className="w-6 h-6" />,
  Gifts: <Gift className="w-6 h-6" />,
  Refreshments: <Coffee className="w-6 h-6" />,
  Offerings: <Church className="w-6 h-6" />,
  Toiletries: <Droplets className="w-6 h-6" />, // Changed from Shower to Droplets
  Taxes: <Receipt className="w-6 h-6" />, // Changed from Receipt2 to Receipt
  Entertainment: <Film className="w-6 h-6" />,
  Other: <MoreHorizontal className="w-6 h-6" />,
};

export function BudgetCard({ category, limit, spent, currency, onBudgetUpdate }: BudgetCardProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const percentage = Math.min((spent / limit) * 100, 100);
  const remaining = Math.max(limit - spent, 0);
  
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "text-red-500";
    if (percent >= 75) return "text-yellow-500";
    return "text-primary";
  };

  const strokeWidth = 8;
  const size = 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const dash = (percentage * circumference) / 100;

  return (
    <>
      <Card 
        className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 bg-card"
        onClick={() => setIsFormOpen(true)}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <svg width={size} height={size} className="-rotate-90">
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/20"
              />
              {/* Progress circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={circumference - dash}
                className={getProgressColor(percentage)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {categoryIcons[category]}
            </div>
          </div>

          <div className="text-center space-y-1">
            <h3 className="font-semibold">{category}</h3>
            <p className="text-sm text-muted-foreground">
              {currency.symbol}{spent.toFixed(2)} / {currency.symbol}{limit.toFixed(2)}
            </p>
            <p className="text-sm font-medium">
              {currency.symbol}{remaining.toFixed(2)} remaining
            </p>
          </div>
        </div>
      </Card>

      <BudgetForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onBudgetAdded={onBudgetUpdate}
        initialCategory={category}
      />
    </>
  );
}

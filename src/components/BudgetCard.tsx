
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
  Toiletries: <Droplets className="w-6 h-6" />,
  Taxes: <Receipt className="w-6 h-6" />,
  Entertainment: <Film className="w-6 h-6" />,
  Other: <MoreHorizontal className="w-6 h-6" />,
  Savings: <MoreHorizontal className="w-6 h-6" />,
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
        className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 bg-card relative overflow-hidden group"
        onClick={() => setIsFormOpen(true)}
      >
        {/* Background decoration */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-300" />
        
        <div className="flex flex-col items-center space-y-4 relative z-10">
          <div className="relative animate-float" style={{ animationDelay: `${Math.random() * 1000}ms` }}>
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
                strokeLinecap="round"
                className={`${getProgressColor(percentage)} animate-progress transition-all duration-700 ease-out`}
                style={{ '--value': `${dash}px` } as React.CSSProperties}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-3 rounded-full bg-background/80 backdrop-blur-sm">
                {categoryIcons[category] || categoryIcons.Other}
              </div>
            </div>
          </div>

          <div className="text-center space-y-1">
            <h3 className="font-semibold">{category}</h3>
            <div className="flex items-center justify-center gap-1 text-sm">
              <span className="font-medium">{currency.symbol}{spent.toFixed(2)}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{currency.symbol}{limit.toFixed(2)}</span>
            </div>
            <p className="text-sm font-medium bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
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

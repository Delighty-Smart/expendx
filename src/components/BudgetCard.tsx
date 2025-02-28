
import { Card } from "@/components/ui/card";
import { Phone, Zap, ShoppingCart, Wifi, Gift, Coffee, Church, Droplets, Receipt, Film, MoreHorizontal, PiggyBank } from "lucide-react";
import { Currency } from "@/lib/currencies";
import { BudgetForm } from "@/components/BudgetForm";
import { useState, useEffect, useRef } from "react";

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
  Savings: <PiggyBank className="w-6 h-6" />,
};

export function BudgetCard({ category, limit, spent, currency, onBudgetUpdate }: BudgetCardProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const percentage = Math.min((spent / limit) * 100, 100);
  const remaining = Math.max(limit - spent, 0);
  
  const circleRef = useRef<SVGCircleElement>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [percentage]);
  
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "#EF4444"; // red
    if (percent >= 75) return "#F59E0B"; // amber
    return "#00AAFF"; // primary blue
  };

  const strokeWidth = 8;
  const size = 120;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const dash = (animatedPercentage * circumference) / 100;
  const color = getProgressColor(percentage);

  return (
    <>
      <Card 
        className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 bg-card relative overflow-hidden group"
        onClick={() => setIsFormOpen(true)}
      >
        {/* Background decoration */}
        <div className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-300" />
        
        <div className="flex flex-col items-center space-y-4 relative z-10">
          <div className="relative animate-float" style={{ animationDelay: `${Math.random() * 1000}ms` }}>
            <svg width={size} height={size} className="-rotate-90">
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#E5E7EB"
                strokeWidth={strokeWidth}
                className="opacity-20"
              />
              
              {/* Dashed guidelines */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#E5E7EB"
                strokeWidth={1}
                strokeDasharray="2 4"
                className="opacity-30"
              />
              
              {/* Progress circle */}
              <circle
                ref={circleRef}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={circumference - dash}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 1s ease-in-out, stroke 0.5s ease-in-out",
                }}
              />
              
              {/* Percentage text */}
              <text
                x={size / 2}
                y={size / 2 + 5}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground font-bold text-xl"
              >
                {Math.round(animatedPercentage)}%
              </text>
            </svg>
            
            <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
              <div className="p-3 rounded-full bg-card shadow-md border border-border">
                {categoryIcons[category] || categoryIcons.Other}
              </div>
            </div>
          </div>

          <div className="text-center space-y-2 w-full">
            <h3 className="font-bold text-lg">{category}</h3>
            <div className="flex items-center justify-between text-sm px-2">
              <div className="flex flex-col items-start">
                <span className="text-muted-foreground text-xs">Spent</span>
                <span className="font-medium text-foreground">{currency.symbol}{spent.toFixed(2)}</span>
              </div>
              <div className="h-6 w-px bg-border"></div>
              <div className="flex flex-col items-end">
                <span className="text-muted-foreground text-xs">Budget</span>
                <span className="font-medium text-foreground">{currency.symbol}{limit.toFixed(2)}</span>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-sm font-medium inline-block px-3 py-1 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 text-primary">
                {currency.symbol}{remaining.toFixed(2)} remaining
              </p>
            </div>
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

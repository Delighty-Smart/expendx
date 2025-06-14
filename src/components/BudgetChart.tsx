
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from "recharts";
import { TransactionType } from "@/types/transactions";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Budget {
  id: string;
  category: string;
  monthly_limit: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
}

interface Currency {
  code: string;
  symbol: string;
}

interface BudgetChartProps {
  budgets: Budget[];
  transactions: Transaction[];
  currency: Currency;
}

export function BudgetChart({ budgets, transactions, currency }: BudgetChartProps) {
  const [hoveredLegendItem, setHoveredLegendItem] = useState<string | null>(null);
  
  // Only use debit transactions for spending chart
  const expenseTransactions = transactions.filter(t => t.type === "debit");
  
  console.log(`BudgetChart: Found ${expenseTransactions.length} expense transactions`);

  // Prepare pie chart data from spending
  const data = budgets
    .map(budget => {
      // Calculate spending for this budget category
      const spent = expenseTransactions
        .filter(t => t.category === budget.category)
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Log each category and its spending for debugging
      console.log(`Category ${budget.category}: spent ${spent}`);
      
      return {
        name: budget.category,
        value: spent,
      };
    })
    .filter(item => item.value > 0); // Remove zero-spending categories

  console.log(`BudgetChart: Generated ${data.length} data points for chart`);

  // Sort data by value in descending order for better visualization
  data.sort((a, b) => b.value - a.value);

  const COLORS = [
    "#00AAFF", // primary blue
    "#A3CE22", // accent green
    "#38BDF8", // lighter blue
    "#BBE878", // lighter green
    "#0079B3", // darker blue
    "#7D9A1A", // darker green
    "#4B5563", // gray
    "#9CA3AF", // light gray
  ];

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Calculate total amount for percentage calculations
  const totalAmount = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="w-full h-[400px]">
      {data.length > 0 ? (
        <div className="space-y-4">
          {/* Pie Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {COLORS.map((color, index) => (
                    <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={1} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.8} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={`url(#gradient-${index % COLORS.length})`}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      opacity={hoveredLegendItem === null || hoveredLegendItem === entry.name ? 1 : 0.3}
                      className="hover:opacity-90 transition-opacity"
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${currency.symbol}${formatAmount(value)}`, `${((value / totalAmount) * 100).toFixed(1)}%`]}
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "0.5rem",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    padding: "0.5rem 1rem"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Legend */}
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {data.map((entry, index) => {
              const percentage = totalAmount > 0 ? ((entry.value / totalAmount) * 100).toFixed(1) : '0';
              return (
                <div
                  key={entry.name}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200",
                    "hover:bg-slate-100 dark:hover:bg-slate-700",
                    hoveredLegendItem === entry.name && "bg-slate-100 dark:bg-slate-700 shadow-sm"
                  )}
                  onMouseEnter={() => setHoveredLegendItem(entry.name)}
                  onMouseLeave={() => setHoveredLegendItem(null)}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium text-sm">{entry.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">
                      {currency.symbol}{formatAmount(entry.value)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {percentage}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-muted">
          <div className="text-center p-6">
            <p className="text-lg font-medium mb-2">No expense data to display</p>
            <p className="text-sm text-muted-foreground">Add transactions to see your spending breakdown</p>
          </div>
        </div>
      )}
    </div>
  );
}

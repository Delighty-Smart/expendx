
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from "recharts";
import { TransactionType } from "@/types/transactions";
import { useState } from "react";

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
  const [activeIndex, setActiveIndex] = useState(0);
  
  const expenseTransactions = transactions.filter(t => t.type === "debit");

  const data = budgets.map(budget => {
    const spent = expenseTransactions
      .filter(t => t.category === budget.category)
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      name: budget.category,
      value: spent,
    };
  }).filter(item => item.value > 0);

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

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    
    return (
      <g>
        <text x={cx} y={cy - 20} dy={8} textAnchor="middle" fill="#888888" className="text-xs">
          {payload.name}
        </text>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="text-xl font-bold">
          {currency.symbol}{formatAmount(value)}
        </text>
        <text x={cx} y={cy + 20} dy={8} textAnchor="middle" fill="#888888" className="text-xs">
          {`${(percent * 100).toFixed(0)}%`}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.3}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  return (
    <div className="w-full h-[350px]">
      {data.length > 0 ? (
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
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              dataKey="value"
              onMouseEnter={onPieEnter}
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
                  className="hover:opacity-90 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `${currency.symbol}${formatAmount(value)}`}
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
                padding: "0.5rem 1rem"
              }}
            />
            <Legend 
              layout="horizontal" 
              verticalAlign="bottom" 
              align="center"
              wrapperStyle={{
                paddingTop: "20px",
                fontSize: "12px"
              }}
              iconType="circle"
              iconSize={10}
            />
          </PieChart>
        </ResponsiveContainer>
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

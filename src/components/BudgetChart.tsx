
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { TransactionType } from "@/types/transactions";

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

  const COLORS = [
    "#4A6741", // dark green from logo
    "#6B8E4E", // medium green
    "#8CB25C", // lighter green
    "#E9B949", // gold from logo
    "#D58936", // orange from logo
    "#A44A3F", // darker orange/red
    "#7B241C", // dark red
    "#4ECDC4", // teal
    "#556B2F", // olive drab
    "#82CA9D", // mint green
  ];

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.1;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill={COLORS[index % COLORS.length]}
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {name} ({(percent * 100).toFixed(0)}%)
      </text>
    );
  };

  return (
    <div className="w-full h-[300px]">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={1}
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `${currency.symbol}${formatAmount(value)}`}
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
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
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No expense data to display
        </div>
      )}
    </div>
  );
}

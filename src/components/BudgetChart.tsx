
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
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
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#FF6B6B",
    "#4ECDC4",
  ];

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, value }) => `${name} (${currency.symbol}${formatAmount(value)})`}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `${currency.symbol}${formatAmount(value)}`}
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

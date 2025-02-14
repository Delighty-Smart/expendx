
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Currency } from "@/lib/currencies";

interface Transaction {
  amount: number;
  category: string;
  type: "credit" | "debit";
}

interface BudgetCategory {
  category: string;
  monthly_limit: number;
}

interface BudgetChartProps {
  budgets: BudgetCategory[];
  transactions: Transaction[];
  currency: Currency;
}

const COLORS = [
  "#4A6741", // primary
  "#C66B4D", // secondary
  "#2D3436", // neutral
  "#6B7280", // gray
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#F59E0B", // yellow
  "#10B981", // green
  "#3B82F6", // blue
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#EC4899", // pink
];

export function BudgetChart({ budgets, transactions, currency }: BudgetChartProps) {
  const calculateSpending = (category: string) => {
    return transactions
      .filter((t) => t.category === category && t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const data = budgets.map((budget) => ({
    name: budget.category,
    value: calculateSpending(budget.category),
  }));

  return (
    <div className="w-full h-[300px]">
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
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${currency.symbol}${value.toFixed(2)}`, "Spent"]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

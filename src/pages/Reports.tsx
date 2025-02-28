
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { LineChart, PieChart, BarChart, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart as RechartBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartPieChart,
  Pie,
  Cell,
  LineChart as RechartLineChart,
  Line,
  Legend,
} from "recharts";
import { useSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { TransactionType } from "@/types/transactions";

const Reports = () => {
  const [showAmounts, setShowAmounts] = useState(true);
  const { currency } = useSettings();
  
  // Get date ranges for the reports
  const today = new Date();
  const currentMonth = startOfMonth(today);
  const previousMonth = startOfMonth(subMonths(today, 1));
  const twoMonthsAgo = startOfMonth(subMonths(today, 2));
  
  // Format dates for display and API calls
  const currentMonthStart = currentMonth.toISOString();
  const currentMonthEnd = endOfMonth(currentMonth).toISOString();
  const previousMonthStart = previousMonth.toISOString();
  const previousMonthEnd = endOfMonth(previousMonth).toISOString();
  const twoMonthsAgoStart = twoMonthsAgo.toISOString();
  const twoMonthsAgoEnd = endOfMonth(twoMonthsAgo).toISOString();

  // Fetch transactions for the current month
  const { data: currentMonthData } = useQuery({
    queryKey: ["transactions", currentMonthStart, currentMonthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("date", currentMonthStart)
        .lte("date", currentMonthEnd);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch transactions for the previous month
  const { data: previousMonthData } = useQuery({
    queryKey: ["transactions", previousMonthStart, previousMonthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("date", previousMonthStart)
        .lte("date", previousMonthEnd);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch transactions for two months ago
  const { data: twoMonthsAgoData } = useQuery({
    queryKey: ["transactions", twoMonthsAgoStart, twoMonthsAgoEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("date", twoMonthsAgoStart)
        .lte("date", twoMonthsAgoEnd);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate totals for each month
  const calculateMonthlyTotals = (data: any[]) => {
    const income = data
      .filter(t => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = data
      .filter(t => t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const savings = data
      .filter(t => t.type === "savings")
      .reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expenses, savings };
  };

  const currentMonthTotals = calculateMonthlyTotals(currentMonthData || []);
  const previousMonthTotals = calculateMonthlyTotals(previousMonthData || []);
  const twoMonthsAgoTotals = calculateMonthlyTotals(twoMonthsAgoData || []);

  // Calculate spending by category for pie chart
  const calculateSpendingByCategory = (data: any[]) => {
    const categorySpending = data
      .filter(t => t.type === "debit")
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
    
    return Object.entries(categorySpending)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const categorySpendingData = calculateSpendingByCategory(currentMonthData || []);

  // Prepare data for the income vs expense bar chart
  const incomeVsExpenseData = [
    {
      month: format(twoMonthsAgo, "MMM"),
      Income: twoMonthsAgoTotals.income,
      Expenses: twoMonthsAgoTotals.expenses,
      Savings: twoMonthsAgoTotals.savings
    },
    {
      month: format(previousMonth, "MMM"),
      Income: previousMonthTotals.income,
      Expenses: previousMonthTotals.expenses,
      Savings: previousMonthTotals.savings
    },
    {
      month: format(currentMonth, "MMM"),
      Income: currentMonthTotals.income,
      Expenses: currentMonthTotals.expenses,
      Savings: currentMonthTotals.savings
    }
  ];

  // Prepare data for monthly spending comparison
  const monthlySavingsData = [
    {
      month: format(twoMonthsAgo, "MMM"),
      Savings: twoMonthsAgoTotals.savings
    },
    {
      month: format(previousMonth, "MMM"),
      Savings: previousMonthTotals.savings
    },
    {
      month: format(currentMonth, "MMM"),
      Savings: currentMonthTotals.savings
    }
  ];

  // Colors for charts
  const COLORS = ["#00AAFF", "#A3CE22", "#4B5563", "#9CA3AF", "#F59E0B", "#EC4899", "#8B5CF6"];

  // Make charts visible immediately
  useEffect(() => {
    const charts = document.querySelectorAll('.chart-container');
    charts.forEach(chart => {
      chart.classList.remove('opacity-0');
      chart.classList.add('opacity-100');
    });
  }, [currentMonthData, previousMonthData, twoMonthsAgoData]);

  // Format amount with proper currency
  const formatAmount = (amount: number) => {
    if (!showAmounts) return "******";
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Toggle visibility of monetary amounts
  const toggleAmountsVisibility = () => {
    setShowAmounts(!showAmounts);
  };

  // Format tooltip values
  const formatTooltipValue = (value: number) => {
    if (!showAmounts) return ["******", ""];
    return [`${currency.symbol}${value.toFixed(2)}`, ""];
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-neutral">Financial Reports</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleAmountsVisibility}
            className="transition-all duration-200 hover:bg-muted"
            aria-label={showAmounts ? "Hide money amounts" : "Show money amounts"}
          >
            {showAmounts ? (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Eye className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 lg:p-6">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Current Month Income</span>
              <span className="text-2xl font-semibold text-green-600">
                {currency.symbol}{formatAmount(currentMonthTotals.income)}
              </span>
              <div className="mt-2 text-xs">
                <span className={`${
                  currentMonthTotals.income >= previousMonthTotals.income ? "text-green-600" : "text-red-600"
                }`}>
                  {currentMonthTotals.income >= previousMonthTotals.income ? "↑" : "↓"} {
                    previousMonthTotals.income > 0 
                      ? `${Math.abs(((currentMonthTotals.income - previousMonthTotals.income) / previousMonthTotals.income) * 100).toFixed(1)}%`
                      : "N/A"
                  }
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 lg:p-6">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Current Month Expenses</span>
              <span className="text-2xl font-semibold text-red-600">
                {currency.symbol}{formatAmount(currentMonthTotals.expenses)}
              </span>
              <div className="mt-2 text-xs">
                <span className={`${
                  currentMonthTotals.expenses <= previousMonthTotals.expenses ? "text-green-600" : "text-red-600"
                }`}>
                  {currentMonthTotals.expenses <= previousMonthTotals.expenses ? "↓" : "↑"} {
                    previousMonthTotals.expenses > 0 
                      ? `${Math.abs(((currentMonthTotals.expenses - previousMonthTotals.expenses) / previousMonthTotals.expenses) * 100).toFixed(1)}%`
                      : "N/A"
                  }
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 lg:p-6">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Current Month Savings</span>
              <span className="text-2xl font-semibold text-blue-600">
                {currency.symbol}{formatAmount(currentMonthTotals.savings)}
              </span>
              <div className="mt-2 text-xs">
                <span className={`${
                  currentMonthTotals.savings >= previousMonthTotals.savings ? "text-green-600" : "text-red-600"
                }`}>
                  {currentMonthTotals.savings >= previousMonthTotals.savings ? "↑" : "↓"} {
                    previousMonthTotals.savings > 0 
                      ? `${Math.abs(((currentMonthTotals.savings - previousMonthTotals.savings) / previousMonthTotals.savings) * 100).toFixed(1)}%`
                      : "N/A"
                  }
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 chart-container transition-opacity duration-500">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart className="h-5 w-5 text-primary" />
              Income vs Expenses (3-Month Comparison)
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartBarChart data={incomeVsExpenseData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis 
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => showAmounts ? `${currency.symbol}${value}` : "***"}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => showAmounts ? [`${currency.symbol}${value.toFixed(2)}`, ""] : ["******", ""]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(229, 231, 235, 0.5)",
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Income" name="Income" fill="#A3CE22" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" name="Expenses" fill="#00AAFF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Savings" name="Savings" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </RechartBarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 chart-container transition-opacity duration-500">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Expense Breakdown (Current Month)
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartPieChart>
                  <Pie
                    data={categorySpendingData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categorySpendingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => showAmounts ? [`${currency.symbol}${value.toFixed(2)}`, "Amount"] : ["******", "Amount"]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(229, 231, 235, 0.5)",
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    }}
                  />
                </RechartPieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 chart-container transition-opacity duration-500 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              Savings Trend (3-Month Comparison)
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartLineChart data={monthlySavingsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis 
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => showAmounts ? `${currency.symbol}${value}` : "***"}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => showAmounts ? [`${currency.symbol}${value.toFixed(2)}`, ""] : ["******", ""]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(229, 231, 235, 0.5)",
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Savings" 
                    stroke="#8B5CF6" 
                    strokeWidth={3}
                    dot={{ stroke: '#8B5CF6', strokeWidth: 2, r: 6, fill: 'white' }}
                    activeDot={{ r: 8, stroke: "#8B5CF6", strokeWidth: 2, fill: "white" }}
                  />
                </RechartLineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;

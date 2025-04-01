
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePickerWithRange } from "@/components/DateRangePicker";
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types/transactions";
import { useSettings } from "@/contexts/SettingsContext";
import { format, isWithinInterval } from "date-fns";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Tooltip,
  Legend
} from "recharts";
import TransactionsTable from "@/components/reports/TransactionsTable";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const Reports = () => {
  const { currency } = useSettings();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });

  // Fetch transactions data
  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      console.log("ReportsPage: Fetching transactions");
      
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });
      
      if (error) throw error;
      
      return data as Transaction[] || [];
    },
  });

  // Fetch budget categories
  const { data: budgetCategories } = useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      console.log("ReportsPage: Fetching budget categories");
      
      const { data, error } = await supabase
        .from("budget_categories")
        .select("*");
      
      if (error) throw error;
      
      return data || [];
    },
  });

  // Filter transactions based on date range
  const filteredTransactions = useMemo(() => {
    if (!transactions || !dateRange.from || !dateRange.to) return [];

    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return isWithinInterval(transactionDate, {
        start: dateRange.from,
        end: dateRange.to
      });
    });
  }, [transactions, dateRange]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!filteredTransactions.length) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        totalSavings: 0,
        netCashflow: 0
      };
    }

    const totalIncome = filteredTransactions
      .filter(t => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpenses = filteredTransactions
      .filter(t => t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalSavings = filteredTransactions
      .filter(t => t.type === "savings")
      .reduce((sum, t) => sum + t.amount, 0);
      
    const netCashflow = totalIncome - totalExpenses - totalSavings;
    
    return { totalIncome, totalExpenses, totalSavings, netCashflow };
  }, [filteredTransactions]);

  // Create data for expenses by category chart
  const expensesByCategory = useMemo(() => {
    if (!filteredTransactions.length) return [];
    
    const expenseTransactions = filteredTransactions.filter(t => t.type === "debit");
    const categories: Record<string, number> = {};
    
    expenseTransactions.forEach(transaction => {
      if (!categories[transaction.category]) {
        categories[transaction.category] = 0;
      }
      categories[transaction.category] += transaction.amount;
    });
    
    return Object.entries(categories).map(([category, amount]) => ({
      category,
      amount
    }));
  }, [filteredTransactions]);

  // Calculate income vs expenses over time
  const timeSeriesData = useMemo(() => {
    if (!filteredTransactions.length || !dateRange.from || !dateRange.to) return [];
    
    // Group by day
    const transactionsByDay: Record<string, { date: string, income: number, expenses: number, savings: number }> = {};
    
    filteredTransactions.forEach(transaction => {
      const date = format(new Date(transaction.date), 'yyyy-MM-dd');
      
      if (!transactionsByDay[date]) {
        transactionsByDay[date] = { 
          date: format(new Date(date), 'MMM dd'), 
          income: 0, 
          expenses: 0,
          savings: 0
        };
      }
      
      if (transaction.type === 'credit') {
        transactionsByDay[date].income += transaction.amount;
      } else if (transaction.type === 'debit') {
        transactionsByDay[date].expenses += transaction.amount;
      } else if (transaction.type === 'savings') {
        transactionsByDay[date].savings += transaction.amount;
      }
    });
    
    return Object.values(transactionsByDay).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [filteredTransactions, dateRange]);

  // Calculate budget vs actual spending
  const budgetVsActual = useMemo(() => {
    if (!filteredTransactions.length || !budgetCategories?.length) return [];
    
    return budgetCategories.map(budget => {
      const spent = filteredTransactions
        .filter(t => t.category === budget.category && t.type === "debit")
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        category: budget.category,
        budget: budget.monthly_limit,
        spent: spent,
        remaining: Math.max(budget.monthly_limit - spent, 0)
      };
    });
  }, [filteredTransactions, budgetCategories]);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#48C9B0', '#F4D03F'];

  const handleExportData = () => {
    // Export functionality could be implemented here
    alert("Export functionality would generate a report PDF or CSV");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Financial Reports</h1>
          <Button variant="outline" className="flex items-center gap-2" onClick={handleExportData}>
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        <Card className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold">Select Date Range</h2>
            <DatePickerWithRange 
              dateRange={dateRange} 
              setDateRange={setDateRange} 
              className="w-full md:w-auto"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <h3 className="text-sm text-muted-foreground mb-1">Total Income</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currency.symbol}{summaryStats.totalIncome.toFixed(2)}</p>
            </Card>
            
            <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <h3 className="text-sm text-muted-foreground mb-1">Total Expenses</h3>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{currency.symbol}{summaryStats.totalExpenses.toFixed(2)}</p>
            </Card>
            
            <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <h3 className="text-sm text-muted-foreground mb-1">Total Savings</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{currency.symbol}{summaryStats.totalSavings.toFixed(2)}</p>
            </Card>
            
            <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <h3 className="text-sm text-muted-foreground mb-1">Net Cashflow</h3>
              <p className={`text-2xl font-bold ${
                summaryStats.netCashflow >= 0 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-red-600 dark:text-red-400"
              }`}>
                {currency.symbol}{Math.abs(summaryStats.netCashflow).toFixed(2)}
                {summaryStats.netCashflow < 0 && <span> (DEFICIT)</span>}
              </p>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-1 sm:grid-cols-4 w-full mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="budgets">Budgets</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Income vs Expenses Over Time</h3>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={timeSeriesData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#3B82F6" />
                      <Bar dataKey="expenses" name="Expenses" fill="#EF4444" />
                      <Bar dataKey="savings" name="Savings" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Expenses by Category</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensesByCategory}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="amount"
                          nameKey="category"
                        >
                          {expensesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${currency.symbol}${parseFloat(value as string).toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Transaction Distribution</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Income', value: summaryStats.totalIncome },
                            { name: 'Expenses', value: summaryStats.totalExpenses },
                            { name: 'Savings', value: summaryStats.totalSavings }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#3B82F6" /> {/* Income */}
                          <Cell fill="#EF4444" /> {/* Expenses */}
                          <Cell fill="#10B981" /> {/* Savings */}
                        </Pie>
                        <Tooltip formatter={(value) => `${currency.symbol}${parseFloat(value as string).toFixed(2)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="expenses">
              <h3 className="text-lg font-medium mb-4">Expense Analysis</h3>
              
              <div className="h-[400px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={expensesByCategory}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="category" />
                    <Tooltip formatter={(value) => `${currency.symbol}${parseFloat(value as string).toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="amount" name="Amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3">Category</th>
                      <th className="text-right py-3">Amount</th>
                      <th className="text-right py-3">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesByCategory.sort((a, b) => b.amount - a.amount).map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3">{item.category}</td>
                        <td className="text-right py-3">{currency.symbol}{item.amount.toFixed(2)}</td>
                        <td className="text-right py-3">
                          {summaryStats.totalExpenses > 0 
                            ? ((item.amount / summaryStats.totalExpenses) * 100).toFixed(1) 
                            : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            
            <TabsContent value="budgets">
              <h3 className="text-lg font-medium mb-4">Budget Analysis</h3>
              
              <div className="h-[400px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={budgetVsActual}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="budget" name="Budget" fill="#8884d8" />
                    <Bar dataKey="spent" name="Actual Spending" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3">Category</th>
                      <th className="text-right py-3">Budget</th>
                      <th className="text-right py-3">Spent</th>
                      <th className="text-right py-3">Remaining</th>
                      <th className="text-right py-3">% Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetVsActual.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3">{item.category}</td>
                        <td className="text-right py-3">{currency.symbol}{item.budget.toFixed(2)}</td>
                        <td className="text-right py-3">{currency.symbol}{item.spent.toFixed(2)}</td>
                        <td className="text-right py-3">{currency.symbol}{item.remaining.toFixed(2)}</td>
                        <td className={`text-right py-3 ${
                          (item.spent / item.budget) * 100 > 90 
                            ? "text-red-500" 
                            : (item.spent / item.budget) * 100 > 75
                            ? "text-yellow-500"
                            : "text-green-500"
                        }`}>
                          {item.budget > 0 ? ((item.spent / item.budget) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            
            <TabsContent value="transactions">
              <TransactionsTable 
                transactions={filteredTransactions} 
                currency={currency}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;

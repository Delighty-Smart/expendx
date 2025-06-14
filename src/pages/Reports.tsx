import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/DateRangePicker";
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/types/transactions";
import { useSettings } from "@/contexts/SettingsContext";
import { format, isWithinInterval, subDays } from "date-fns";
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
import { Download, Calendar, FileDown, TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const Reports = () => {
  const { currency, hideAmounts } = useSettings();
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30), // Default: Last 30 days
    to: new Date()
  });
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  // Move formatCurrency function to use the component's currency and hideAmounts values
  const formatCurrency = (amount: number) => {
    if (hideAmounts) {
      return '***';
    }
    return `${currency.symbol}${amount.toFixed(2)}`;
  };

  // Handle export data
  const handleExportData = () => {
    setIsExporting(true);

    try {
      // Create CSV header
      const csvHeader = ["Date", "Description", "Category", "Type", "Amount"].join(",") + "\n";

      // Create CSV rows
      const csvRows = filteredTransactions.map(t => {
        const date = format(new Date(t.date), "yyyy-MM-dd");
        const description = `"${t.description.replace(/"/g, '""')}"`;
        const category = t.category;
        const type = t.type;
        const amount = t.amount.toString();
        
        return [date, description, category, type, amount].join(",");
      }).join("\n");

      // Combine header and rows
      const csvContent = csvHeader + csvRows;
      
      // Create date range string for filename
      const fromDate = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : "start";
      const toDate = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : "end";

      // Create CSV file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `financial-report_${fromDate}_to_${toDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to download report");
    } finally {
      setIsExporting(false);
    }
  };

  // Get preset date ranges
  const getPresetDateRanges = () => {
    const today = new Date();
    return (
      <div className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs"
          onClick={() => setDateRange({
            from: subDays(today, 7),
            to: today
          })}
        >
          Last 7 days
        </Button>
        <Button 
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setDateRange({
            from: subDays(today, 30),
            to: today
          })}
        >
          Last 30 days
        </Button>
        <Button 
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setDateRange({
            from: new Date(today.getFullYear(), today.getMonth(), 1),
            to: today
          })}
        >
          This month
        </Button>
        <Button 
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setDateRange({
            from: new Date(today.getFullYear(), 0, 1),
            to: today
          })}
        >
          This year
        </Button>
      </div>
    );
  };

  const tabOptions = [
    { value: "overview", label: "📊 Overview" },
    { value: "expenses", label: "💰 Expenses" },
    { value: "budgets", label: "🎯 Budgets" },
    { value: "transactions", label: "📝 Transactions" }
  ];

  const renderTabContent = (tabValue: string) => {
    switch (tabValue) {
      case "overview":
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold mb-6 text-slate-800 dark:text-slate-200">Income vs Expenses Over Time</h3>
              <div className="h-[350px] w-full bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={timeSeriesData}
                    margin={{ 
                      top: 20, 
                      right: isMobile ? 10 : 30, 
                      left: isMobile ? 0 : 20, 
                      bottom: 5 
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: isMobile ? 10 : 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: isMobile ? 10 : 12, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                    <Bar dataKey="income" name="Income" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="savings" name="Savings" fill="#10B981" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <Separator className="my-8" />
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-6 text-slate-800 dark:text-slate-200">Expenses by Category</h3>
                <div className="h-[350px] w-full bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-xl p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={!isMobile ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%` : false}
                        outerRadius={isMobile ? 70 : 90}
                        fill="#8884d8"
                        dataKey="amount"
                        nameKey="category"
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => `${currency.symbol}${parseFloat(value as string).toFixed(2)}`}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      {!isMobile && (
                        <Legend 
                          wrapperStyle={{ fontSize: 10 }}
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                        />
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {isMobile && expensesByCategory.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    {expensesByCategory.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-sm" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="truncate">{entry.category}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-6 text-slate-800 dark:text-slate-200">Transaction Distribution</h3>
                <div className="h-[350px] w-full bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-xl p-4">
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
                        label={!isMobile ? ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%` : false}
                        outerRadius={isMobile ? 70 : 90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#3B82F6" />
                        <Cell fill="#EF4444" />
                        <Cell fill="#10B981" />
                      </Pie>
                      <Tooltip 
                        formatter={(value) => `${currency.symbol}${parseFloat(value as string).toFixed(2)}`}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      {!isMobile && (
                        <Legend 
                          wrapperStyle={{ fontSize: 10 }}
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                        />
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {isMobile && (
                  <div className="mt-4 grid grid-cols-1 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-blue-500" />
                      <span>Income</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-red-500" />
                      <span>Expenses</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-green-500" />
                      <span>Savings</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "expenses":
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6 text-slate-800 dark:text-slate-200">Expense Analysis</h3>
            
            <div className="h-[350px] w-full mb-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={expensesByCategory}
                  layout="vertical"
                  margin={{ 
                    top: 5, 
                    right: isMobile ? 10 : 30, 
                    left: isMobile ? 70 : 100, 
                    bottom: 5 
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12, fill: '#64748b' }} />
                  <YAxis 
                    type="category" 
                    dataKey="category" 
                    tick={{ fontSize: isMobile ? 10 : 12, fill: '#64748b' }}
                    width={isMobile ? 70 : 100} 
                  />
                  <Tooltip 
                    formatter={(value) => `${currency.symbol}${parseFloat(value as string).toFixed(2)}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="amount" name="Amount" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70">
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 font-semibold text-slate-700 dark:text-slate-300">Category</th>
                        <th className="text-right py-3 font-semibold text-slate-700 dark:text-slate-300">Amount</th>
                        <th className="text-right py-3 font-semibold text-slate-700 dark:text-slate-300">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expensesByCategory.sort((a, b) => b.amount - a.amount).map((item, index) => (
                        <tr key={index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 text-slate-800 dark:text-slate-200">{item.category}</td>
                          <td className="text-right py-3 font-medium text-slate-800 dark:text-slate-200">
                            {currency.symbol}{item.amount.toFixed(2)}
                          </td>
                          <td className="text-right py-3 text-slate-600 dark:text-slate-400">
                            {summaryStats.totalExpenses > 0 
                              ? ((item.amount / summaryStats.totalExpenses) * 100).toFixed(1) 
                              : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "budgets":
        return (
          <div>
            <h3 className="text-xl font-semibold mb-6 text-slate-800 dark:text-slate-200">Budget Analysis</h3>
            
            <div className="h-[350px] w-full mb-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={budgetVsActual}
                  margin={{ 
                    top: 20, 
                    right: isMobile ? 10 : 30, 
                    left: isMobile ? 0 : 20, 
                    bottom: 5 
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fontSize: isMobile ? 10 : 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: isMobile ? 10 : 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                  <Bar dataKey="budget" name="Budget" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="spent" name="Actual Spending" fill="#10B981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70">
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 font-semibold text-slate-700 dark:text-slate-300">Category</th>
                        <th className="text-right py-3 font-semibold text-slate-700 dark:text-slate-300">Budget</th>
                        <th className="text-right py-3 font-semibold text-slate-700 dark:text-slate-300">Spent</th>
                        <th className="text-right py-3 font-semibold text-slate-700 dark:text-slate-300">Remaining</th>
                        <th className="text-right py-3 font-semibold text-slate-700 dark:text-slate-300">% Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetVsActual.map((item, index) => (
                        <tr key={index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 text-slate-800 dark:text-slate-200">{item.category}</td>
                          <td className="text-right py-3 font-medium text-slate-800 dark:text-slate-200">
                            {currency.symbol}{item.budget.toFixed(2)}
                          </td>
                          <td className="text-right py-3 font-medium text-slate-800 dark:text-slate-200">
                            {currency.symbol}{item.spent.toFixed(2)}
                          </td>
                          <td className="text-right py-3 font-medium text-slate-800 dark:text-slate-200">
                            {currency.symbol}{item.remaining.toFixed(2)}
                          </td>
                          <td className={`text-right py-3 font-semibold ${
                            (item.spent / item.budget) * 100 > 90 
                              ? "text-red-600" 
                              : (item.spent / item.budget) * 100 > 75
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}>
                            {item.budget > 0 ? ((item.spent / item.budget) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "transactions":
        return (
          <TransactionsTable 
            transactions={filteredTransactions} 
            currency={currency}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                Financial Reports
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">Comprehensive insights into your financial performance</p>
            </div>
            
            <Button 
              variant="default" 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg transition-all duration-200 flex items-center gap-2" 
              onClick={handleExportData}
              disabled={isExporting || filteredTransactions.length === 0}
            >
              {isExporting ? "Exporting..." : "Export Report"}
              <FileDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Date Range Selection */}
          <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Calendar className="h-5 w-5 text-blue-600" />
                Select Date Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <DatePickerWithRange 
                  dateRange={dateRange} 
                  setDateRange={setDateRange} 
                  className="w-full lg:w-auto"
                />
                
                <div className="w-full lg:w-auto">
                  {getPresetDateRanges()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Income</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                      {formatCurrency(summaryStats.totalIncome)}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-1">
                      {formatCurrency(summaryStats.totalExpenses)}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-red-600 rounded-full flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Savings</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                      {formatCurrency(summaryStats.totalSavings)}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-600 rounded-full flex items-center justify-center">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Net Cashflow</p>
                    <p className={`text-2xl font-bold mt-1 ${
                      summaryStats.netCashflow >= 0 
                        ? "text-green-700 dark:text-green-300" 
                        : "text-red-700 dark:text-red-300"
                    }`}>
                      {formatCurrency(Math.abs(summaryStats.netCashflow))}
                      {summaryStats.netCashflow < 0 && <span className="text-sm"> DEFICIT</span>}
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    summaryStats.netCashflow >= 0 ? "bg-green-600" : "bg-red-600"
                  }`}>
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Section */}
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-0">
              {/* Mobile-friendly tab navigation */}
              {isMobile ? (
                <div className="px-6 pt-6 pb-4">
                  <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-lg h-12 text-base font-medium">
                      <SelectValue placeholder="Select a view" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 shadow-lg z-50">
                      {tabOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-base py-3 hover:bg-slate-100 dark:hover:bg-slate-700">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="px-6 pt-6">
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                      <TabsTrigger value="overview" className="rounded-md font-medium text-sm">Overview</TabsTrigger>
                      <TabsTrigger value="expenses" className="rounded-md font-medium text-sm">Expenses</TabsTrigger>
                      <TabsTrigger value="budgets" className="rounded-md font-medium text-sm">Budgets</TabsTrigger>
                      <TabsTrigger value="transactions" className="rounded-md font-medium text-sm">Transactions</TabsTrigger>
                    </TabsList>
                  </div>
                </Tabs>
              )}

              {/* Tab Content */}
              <div className="p-6">
                {renderTabContent(activeTab)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;

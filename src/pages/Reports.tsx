
import { useState, useMemo } from "react";
import { CalendarIcon, Download, TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, GlassCard } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionsTable } from "@/components/reports/TransactionsTable";
import { useTransactionData } from "@/hooks/useTransactionData";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRefresh } from "@/hooks/useRefresh";

// Define chart data types
interface ChartDataPoint {
  date: string;
  income: number;
  expenses: number;
  savings: number;
}

interface CategoryDataPoint {
  category: string;
  amount: number;
}

const ReportsPage = () => {
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const { currency } = useSettings();
  const { refreshData } = useRefresh();

  const { transactions, isLoading } = useTransactionData({
    startDate: dateFrom?.toISOString(),
    endDate: dateTo?.toISOString(),
  });

  // Filter transactions based on selections
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(transaction => {
      const categoryMatch = selectedCategory === "all" || transaction.category === selectedCategory;
      const typeMatch = selectedType === "all" || transaction.type === selectedType;
      return categoryMatch && typeMatch;
    });
  }, [transactions, selectedCategory, selectedType]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    if (!transactions) return [];
    return Array.from(new Set(transactions.map(t => t.category))).sort();
  }, [transactions]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!filteredTransactions) return { income: 0, expenses: 0, savings: 0, net: 0 };
    
    const income = filteredTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expenses = filteredTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const savings = filteredTransactions
      .filter(t => t.type === 'savings')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    return {
      income,
      expenses,
      savings,
      net: income - expenses
    };
  }, [filteredTransactions]);

  // Prepare chart data with proper typing
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!filteredTransactions) return [];
    
    const dailyData = filteredTransactions.reduce((acc, transaction) => {
      const date = format(new Date(transaction.date), 'MMM dd');
      
      if (!acc[date]) {
        acc[date] = { date, income: 0, expenses: 0, savings: 0 };
      }
      
      if (transaction.type === 'credit') {
        acc[date].income += Number(transaction.amount);
      } else if (transaction.type === 'debit') {
        acc[date].expenses += Number(transaction.amount);
      } else if (transaction.type === 'savings') {
        acc[date].savings += Number(transaction.amount);
      }
      
      return acc;
    }, {} as Record<string, ChartDataPoint>);
    
    return Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredTransactions]);

  // Prepare category breakdown with proper typing
  const categoryData = useMemo((): CategoryDataPoint[] => {
    if (!filteredTransactions) return [];
    
    const categoryTotals = filteredTransactions.reduce((acc, transaction) => {
      if (!acc[transaction.category]) {
        acc[transaction.category] = 0;
      }
      acc[transaction.category] += Number(transaction.amount);
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const exportData = () => {
    const csvContent = [
      ['Date', 'Amount', 'Type', 'Category', 'Description'],
      ...filteredTransactions.map(t => [
        format(new Date(t.date), 'yyyy-MM-dd'),
        t.amount.toString(),
        t.type,
        t.category,
        t.description || ''
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${format(dateFrom, 'yyyy-MM-dd')}-to-${format(dateTo, 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <Layout>
      <PullToRefresh onRefresh={refreshData} containerClassName="h-full">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold">Financial Reports</h1>
            <Button onClick={exportData} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Filters */}
          <GlassCard className="p-4 bg-gradient-to-br from-white/80 via-blue-50/40 to-purple-50/20 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-600/20 border-blue-200/30 dark:border-slate-600/30">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">From:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => date && setDateFrom(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">To:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => date && setDateTo(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Income</SelectItem>
                  <SelectItem value="debit">Expenses</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </GlassCard>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-4 bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-teal-50/40 dark:from-green-950/30 dark:via-emerald-950/20 dark:to-teal-950/10 border-green-200/30 dark:border-green-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Income</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {currency.symbol}{formatAmount(summaryMetrics.income)}
                  </p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 bg-gradient-to-br from-red-50/80 via-rose-50/60 to-pink-50/40 dark:from-red-950/30 dark:via-rose-950/20 dark:to-pink-950/10 border-red-200/30 dark:border-red-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 dark:from-red-400 dark:to-rose-500 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Expenses</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {currency.symbol}{formatAmount(summaryMetrics.expenses)}
                  </p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/40 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/10 border-blue-200/30 dark:border-blue-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Savings</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {currency.symbol}{formatAmount(summaryMetrics.savings)}
                  </p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 bg-gradient-to-br from-purple-50/80 via-violet-50/60 to-indigo-50/40 dark:from-purple-950/30 dark:via-violet-950/20 dark:to-indigo-950/10 border-purple-200/30 dark:border-purple-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 dark:from-purple-400 dark:to-violet-500 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Net</p>
                  <p className={`text-lg font-bold ${summaryMetrics.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {currency.symbol}{formatAmount(summaryMetrics.net)}
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Charts and Table */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <GlassCard className="p-6 bg-gradient-to-br from-white/80 via-slate-50/40 to-gray-50/20 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-600/20 border-slate-200/30 dark:border-slate-600/30">
                <h3 className="text-lg font-semibold mb-4">Daily Balance Overview</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="savings" stackId="3" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <GlassCard className="p-6 bg-gradient-to-br from-white/80 via-slate-50/40 to-gray-50/20 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-600/20 border-slate-200/30 dark:border-slate-600/30">
                <h3 className="text-lg font-semibold mb-4">Income vs Expenses Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="savings" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </GlassCard>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <GlassCard className="p-6 bg-gradient-to-br from-white/80 via-slate-50/40 to-gray-50/20 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-600/20 border-slate-200/30 dark:border-slate-600/30">
                  <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        dataKey="amount"
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.category} ${(entry.percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </GlassCard>

                <GlassCard className="p-6 bg-gradient-to-br from-white/80 via-slate-50/40 to-gray-50/20 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-600/20 border-slate-200/30 dark:border-slate-600/30">
                  <h3 className="text-lg font-semibold mb-4">Category Amounts</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </GlassCard>
              </div>
            </TabsContent>

            <TabsContent value="transactions">
              <GlassCard className="p-6 bg-gradient-to-br from-white/80 via-slate-50/40 to-gray-50/20 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-600/20 border-slate-200/30 dark:border-slate-600/30">
                <TransactionsTable 
                  transactions={filteredTransactions}
                  currency={currency}
                />
              </GlassCard>
            </TabsContent>
          </Tabs>
        </div>
      </PullToRefresh>
    </Layout>
  );
};

export default ReportsPage;

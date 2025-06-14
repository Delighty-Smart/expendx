
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
import { Transaction } from "@/types/transactions";

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

  // Filter transactions based on selections with proper typing
  const filteredTransactions = useMemo((): Transaction[] => {
    if (!transactions) return [];
    
    const typedTransactions = transactions as Transaction[];
    
    return typedTransactions.filter(transaction => {
      const categoryMatch = selectedCategory === "all" || transaction.category === selectedCategory;
      const typeMatch = selectedType === "all" || transaction.type === selectedType;
      return categoryMatch && typeMatch;
    });
  }, [transactions, selectedCategory, selectedType]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    if (!transactions) return [];
    const typedTransactions = transactions as Transaction[];
    return Array.from(new Set(typedTransactions.map(t => t.category))).sort();
  }, [transactions]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!filteredTransactions || filteredTransactions.length === 0) return { income: 0, expenses: 0, savings: 0, net: 0 };
    
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
    if (!filteredTransactions || filteredTransactions.length === 0) return [];
    
    const dailyData = filteredTransactions.reduce((acc, transaction) => {
      const date = format(new Date(transaction.date), 'MMM dd');
      
      if (!acc[date]) {
        acc[date] = { date, income: 0, expenses: 0, savings: 0 };
      }
      
      const amount = Number(transaction.amount);
      if (transaction.type === 'credit') {
        acc[date].income += amount;
      } else if (transaction.type === 'debit') {
        acc[date].expenses += amount;
      } else if (transaction.type === 'savings') {
        acc[date].savings += amount;
      }
      
      return acc;
    }, {} as Record<string, ChartDataPoint>);
    
    return Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredTransactions]);

  // Prepare category breakdown with proper typing
  const categoryData = useMemo((): CategoryDataPoint[] => {
    if (!filteredTransactions || filteredTransactions.length === 0) return [];
    
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="container mx-auto px-4 py-6 space-y-8">
            
            {/* Header Section */}
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Financial Reports
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Comprehensive analysis of your financial data
                  </p>
                </div>
                <Button onClick={exportData} size="lg" className="flex items-center gap-2 shadow-lg">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Filters Section */}
            <GlassCard className="p-6 bg-gradient-to-br from-white/90 via-blue-50/50 to-purple-50/30 dark:from-slate-800/60 dark:via-slate-700/40 dark:to-slate-600/30 border-blue-200/40 dark:border-slate-600/40">
              <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-300">Filter Options</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Date From */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">From Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-11",
                          !dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={(date) => date && setDateFrom(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">To Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-11",
                          !dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "MMM dd, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={(date) => date && setDateTo(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Category Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-11">
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
                </div>

                {/* Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="h-11">
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

              </div>
            </GlassCard>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Income Card */}
              <GlassCard className="p-6 bg-gradient-to-br from-green-50/90 via-emerald-50/70 to-teal-50/50 dark:from-green-950/40 dark:via-emerald-950/30 dark:to-teal-950/20 border-green-200/40 dark:border-green-800/40">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 flex items-center justify-center shadow-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Total Income</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {currency.symbol}{formatAmount(summaryMetrics.income)}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Expenses Card */}
              <GlassCard className="p-6 bg-gradient-to-br from-red-50/90 via-rose-50/70 to-pink-50/50 dark:from-red-950/40 dark:via-rose-950/30 dark:to-pink-950/20 border-red-200/40 dark:border-red-800/40">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 dark:from-red-400 dark:to-rose-500 flex items-center justify-center shadow-lg">
                    <TrendingDown className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {currency.symbol}{formatAmount(summaryMetrics.expenses)}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Savings Card */}
              <GlassCard className="p-6 bg-gradient-to-br from-blue-50/90 via-indigo-50/70 to-purple-50/50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/20 border-blue-200/40 dark:border-blue-800/40">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 flex items-center justify-center shadow-lg">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Total Savings</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {currency.symbol}{formatAmount(summaryMetrics.savings)}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Net Balance Card */}
              <GlassCard className="p-6 bg-gradient-to-br from-purple-50/90 via-violet-50/70 to-indigo-50/50 dark:from-purple-950/40 dark:via-violet-950/30 dark:to-indigo-950/20 border-purple-200/40 dark:border-purple-800/40">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 dark:from-purple-400 dark:to-violet-500 flex items-center justify-center shadow-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Net Balance</p>
                    <p className={`text-2xl font-bold ${summaryMetrics.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {currency.symbol}{formatAmount(summaryMetrics.net)}
                    </p>
                  </div>
                </div>
              </GlassCard>

            </div>

            {/* Charts and Analytics */}
            <Tabs defaultValue="overview" className="space-y-6">
              <div className="flex justify-center">
                <TabsList className="grid w-full max-w-md grid-cols-4 h-12">
                  <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                  <TabsTrigger value="trends" className="text-xs sm:text-sm">Trends</TabsTrigger>
                  <TabsTrigger value="categories" className="text-xs sm:text-sm">Categories</TabsTrigger>
                  <TabsTrigger value="transactions" className="text-xs sm:text-sm">Data</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-6">
                <GlassCard className="p-8 bg-gradient-to-br from-white/90 via-slate-50/50 to-gray-50/30 dark:from-slate-800/60 dark:via-slate-700/40 dark:to-slate-600/30 border-slate-200/40 dark:border-slate-600/40">
                  <h3 className="text-xl font-semibold mb-6 text-slate-700 dark:text-slate-300">Daily Financial Overview</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                          </linearGradient>
                          <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: 'none', 
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }} 
                        />
                        <Legend />
                        <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="url(#incomeGradient)" name="Income" />
                        <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="url(#expensesGradient)" name="Expenses" />
                        <Area type="monotone" dataKey="savings" stackId="3" stroke="#3b82f6" fill="url(#savingsGradient)" name="Savings" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </TabsContent>

              <TabsContent value="trends" className="space-y-6">
                <GlassCard className="p-8 bg-gradient-to-br from-white/90 via-slate-50/50 to-gray-50/30 dark:from-slate-800/60 dark:via-slate-700/40 dark:to-slate-600/30 border-slate-200/40 dark:border-slate-600/40">
                  <h3 className="text-xl font-semibold mb-6 text-slate-700 dark:text-slate-300">Financial Trends Analysis</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: 'none', 
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }} 
                        />
                        <Legend />
                        <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Income" />
                        <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name="Expenses" />
                        <Line type="monotone" dataKey="savings" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Savings" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </TabsContent>

              <TabsContent value="categories" className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* Pie Chart */}
                  <GlassCard className="p-8 bg-gradient-to-br from-white/90 via-slate-50/50 to-gray-50/30 dark:from-slate-800/60 dark:via-slate-700/40 dark:to-slate-600/30 border-slate-200/40 dark:border-slate-600/40">
                    <h3 className="text-xl font-semibold mb-6 text-slate-700 dark:text-slate-300">Category Distribution</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            dataKey="amount"
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ category, percent }: any) => `${category} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={100}
                            fill="#8884d8"
                          >
                            {categoryData.map((entry: CategoryDataPoint, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: 'none', 
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>

                  {/* Bar Chart */}
                  <GlassCard className="p-8 bg-gradient-to-br from-white/90 via-slate-50/50 to-gray-50/30 dark:from-slate-800/60 dark:via-slate-700/40 dark:to-slate-600/30 border-slate-200/40 dark:border-slate-600/40">
                    <h3 className="text-xl font-semibold mb-6 text-slate-700 dark:text-slate-300">Top Categories by Amount</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData.slice(0, 8)} layout="horizontal">
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis dataKey="category" type="category" width={80} tick={{ fontSize: 10 }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                              border: 'none', 
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }} 
                          />
                          <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>

                </div>
              </TabsContent>

              <TabsContent value="transactions" className="space-y-6">
                <GlassCard className="p-8 bg-gradient-to-br from-white/90 via-slate-50/50 to-gray-50/30 dark:from-slate-800/60 dark:via-slate-700/40 dark:to-slate-600/30 border-slate-200/40 dark:border-slate-600/40">
                  <h3 className="text-xl font-semibold mb-6 text-slate-700 dark:text-slate-300">Transaction Details</h3>
                  <TransactionsTable 
                    transactions={filteredTransactions}
                    currency={currency}
                  />
                </GlassCard>
              </TabsContent>

            </Tabs>

          </div>
        </div>
      </PullToRefresh>
    </Layout>
  );
};

export default ReportsPage;

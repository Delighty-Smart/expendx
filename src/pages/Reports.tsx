import { useState, useMemo } from "react";
import { CalendarIcon, Download, TrendingUp, TrendingDown, DollarSign, BarChart3, FileText, Calendar, PieChart, Shapes } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TransactionsTable } from "@/components/reports/TransactionsTable";
import { useTransactionData } from "@/hooks/useTransactionData";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRefresh } from "@/hooks/useRefresh";
import { Transaction } from "@/types/transactions";
import { useCategories } from "@/hooks/useCategories";

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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [hoveredLegendItem, setHoveredLegendItem] = useState<string | null>(null);
  const { currency } = useSettings();
  const { refreshData } = useRefresh();

  // Get categories based on selected type
  const { categories: allIncomeCategories } = useCategories('credit');
  const { categories: allExpenseCategories } = useCategories('debit');
  const { categories: allSavingsCategories } = useCategories('savings');

  // Get categories based on selected transaction type
  const availableCategories = useMemo(() => {
    if (selectedType === "all") {
      return [...new Set([
        ...allIncomeCategories,
        ...allExpenseCategories,
        ...allSavingsCategories
      ])];
    } else if (selectedType === "credit") {
      return allIncomeCategories;
    } else if (selectedType === "debit") {
      return allExpenseCategories;
    } else if (selectedType === "savings") {
      return allSavingsCategories;
    }
    return [];
  }, [selectedType, allIncomeCategories, allExpenseCategories, allSavingsCategories]);

  const { transactions, isLoading } = useTransactionData({
    startDate: dateFrom?.toISOString(),
    endDate: dateTo?.toISOString(),
  });

  // Filter transactions based on selections with proper typing
  const filteredTransactions = useMemo((): Transaction[] => {
    if (!transactions) return [];
    
    const typedTransactions = transactions as Transaction[];
    
    return typedTransactions.filter(transaction => {
      const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(transaction.category);
      const typeMatch = selectedType === "all" || transaction.type === selectedType;
      return categoryMatch && typeMatch;
    });
  }, [transactions, selectedCategories, selectedType]);

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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

  const totalAmount = categoryData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Layout>
      <PullToRefresh onRefresh={refreshData} containerClassName="h-full">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="container mx-auto px-4 py-6 space-y-6">
            
            {/* Header Section */}
            <div className="sticky top-14 lg:top-0 z-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 pb-4 mb-4 border-b border-border/50 text-center space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
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

            {/* Filters Card */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white/95 to-blue-50/50 dark:from-slate-800/95 dark:to-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Filter Options
                </CardTitle>
                <CardDescription>
                  Customize your report view with date range and category filters
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                        <CalendarComponent
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
                        <CalendarComponent
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
                    <label className="text-sm font-medium text-muted-foreground">Categories</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="h-11 px-3 border-border text-left justify-between w-full"
                        >
                          <div className="flex items-center gap-2">
                            <Shapes className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate text-sm">
                              {selectedCategories.length > 0 
                                ? `Categories (${selectedCategories.length})` 
                                : "All Categories"
                              }
                            </span>
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0 z-50 bg-popover border shadow-lg" align="start">
                        <div className="p-3">
                          <h4 className="font-medium mb-3">Select Categories</h4>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {availableCategories.map((category) => (
                              <div 
                                key={category} 
                                className={cn(
                                  "flex items-center p-2 rounded-md cursor-pointer transition-colors text-sm",
                                  selectedCategories.includes(category)
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-muted/50"
                                )}
                                onClick={() => {
                                  if (selectedCategories.includes(category)) {
                                    setSelectedCategories(prev => prev.filter(c => c !== category));
                                  } else {
                                    setSelectedCategories(prev => [...prev, category]);
                                  }
                                }}
                              >
                                <Shapes className="h-3 w-3 mr-2 flex-shrink-0" />
                                <span className="truncate">{category}</span>
                              </div>
                            ))}
                          </div>
                          {selectedCategories.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-3"
                              onClick={() => setSelectedCategories([])}
                            >
                              Clear All
                            </Button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
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
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Income Card */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50/90 to-emerald-50/70 dark:from-green-950/40 dark:to-emerald-950/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 flex items-center justify-center shadow-lg">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Total Income</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400 truncate">
                        {currency.symbol}{formatAmount(summaryMetrics.income)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expenses Card */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-red-50/90 to-rose-50/70 dark:from-red-950/40 dark:to-rose-950/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 dark:from-red-400 dark:to-rose-500 flex items-center justify-center shadow-lg">
                      <TrendingDown className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Total Expenses</p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400 truncate">
                        {currency.symbol}{formatAmount(summaryMetrics.expenses)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Savings Card */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 flex items-center justify-center shadow-lg">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Total Savings</p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400 truncate">
                        {currency.symbol}{formatAmount(summaryMetrics.savings)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Net Balance Card */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50/90 to-violet-50/70 dark:from-purple-950/40 dark:to-violet-950/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 dark:from-purple-400 dark:to-violet-500 flex items-center justify-center shadow-lg">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Net Balance</p>
                      <p className={`text-xl font-bold truncate ${summaryMetrics.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {currency.symbol}{formatAmount(summaryMetrics.net)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Accordion Sections - Changed to single select */}
            <Accordion type="single" defaultValue="overview" collapsible className="space-y-4">
              
              {/* Financial Overview Section */}
              <AccordionItem value="overview">
                <Card className="shadow-lg border-0 bg-gradient-to-br from-white/95 to-slate-50/50 dark:from-slate-800/95 dark:to-slate-700/50">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">Daily Financial Overview</h3>
                        <p className="text-sm text-muted-foreground">Income, expenses, and savings trends</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
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
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Trends Analysis Section */}
              <AccordionItem value="trends">
                <Card className="shadow-lg border-0 bg-gradient-to-br from-white/95 to-slate-50/50 dark:from-slate-800/95 dark:to-slate-700/50">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">Financial Trends Analysis</h3>
                        <p className="text-sm text-muted-foreground">Line chart view of your financial patterns</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
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
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Category Analysis Section with Interactive Legend */}
              <AccordionItem value="categories">
                <Card className="shadow-lg border-0 bg-gradient-to-br from-white/95 to-slate-50/50 dark:from-slate-800/95 dark:to-slate-700/50">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                        <PieChart className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">Category Analysis</h3>
                        <p className="text-sm text-muted-foreground">Breakdown by spending categories</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      
                      {/* Interactive Pie Chart */}
                      <Card className="border-0 bg-gradient-to-br from-white/80 to-slate-50/40 dark:from-slate-700/80 dark:to-slate-600/40">
                        <CardHeader>
                          <CardTitle className="text-lg">Category Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Pie Chart */}
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                  <Pie
                                    dataKey="amount"
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                  >
                                    {categoryData.map((entry: CategoryDataPoint, index: number) => (
                                      <Cell 
                                        key={`cell-${index}`} 
                                        fill={COLORS[index % COLORS.length]}
                                        opacity={hoveredLegendItem === null || hoveredLegendItem === entry.category ? 1 : 0.3}
                                        stroke={hoveredLegendItem === entry.category ? "#333" : "none"}
                                        strokeWidth={hoveredLegendItem === entry.category ? 2 : 0}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                    formatter={(value: number) => [`${currency.symbol}${formatAmount(value)}`, 'Amount']}
                                    contentStyle={{ 
                                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                      border: 'none', 
                                      borderRadius: '8px',
                                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }} 
                                  />
                                </RechartsPieChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Interactive Legend */}
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {categoryData.map((entry: CategoryDataPoint, index: number) => {
                                const percentage = totalAmount > 0 ? ((entry.amount / totalAmount) * 100).toFixed(1) : '0';
                                return (
                                  <div
                                    key={entry.category}
                                    className={cn(
                                      "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200",
                                      "hover:bg-slate-100 dark:hover:bg-slate-700",
                                      hoveredLegendItem === entry.category && "bg-slate-100 dark:bg-slate-700 shadow-sm"
                                    )}
                                    onMouseEnter={() => setHoveredLegendItem(entry.category)}
                                    onMouseLeave={() => setHoveredLegendItem(null)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div 
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                      />
                                      <span className="font-medium text-sm">{entry.category}</span>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-semibold text-sm">
                                        {currency.symbol}{formatAmount(entry.amount)}
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
                        </CardContent>
                      </Card>

                      {/* Bar Chart */}
                      <Card className="border-0 bg-gradient-to-br from-white/80 to-slate-50/40 dark:from-slate-700/80 dark:to-slate-600/40">
                        <CardHeader>
                          <CardTitle className="text-lg">Top Categories by Amount</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={categoryData.slice(0, 8)} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis type="number" tick={{ fontSize: 12 }} />
                                <YAxis dataKey="category" type="category"  tick={{ fontSize: 10 }} />
                                <Tooltip 
                                  formatter={(value: number) => [`${currency.symbol}${formatAmount(value)}`, 'Amount']}
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
                        </CardContent>
                      </Card>

                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Transaction Details Section */}
              <AccordionItem value="transactions">
                <Card className="shadow-lg border-0 bg-gradient-to-br from-white/95 to-slate-50/50 dark:from-slate-800/95 dark:to-slate-700/50">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">Transaction Details</h3>
                        <p className="text-sm text-muted-foreground">Complete list of filtered transactions</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <TransactionsTable 
                      transactions={filteredTransactions}
                      currency={currency}
                    />
                  </AccordionContent>
                </Card>
              </AccordionItem>

            </Accordion>

          </div>
        </div>
      </PullToRefresh>
    </Layout>
  );
};

export default ReportsPage;

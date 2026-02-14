import { useState, useMemo } from "react";
import { CalendarIcon, Download, TrendingUp, TrendingDown, DollarSign, BarChart3, FileText, Calendar, PieChart, Shapes, FileSpreadsheet } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, GlassCard } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PageHeader } from "@/components/ui/page-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { TransactionsTable } from "@/components/reports/TransactionsTable";
import { useEnhancedTransactionData } from "@/hooks/useEnhancedTransactionData";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRefresh } from "@/hooks/useRefresh";
import { Transaction } from "@/types/transactions";
import { useCategories } from "@/hooks/useCategories";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

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

  const {
    transactions,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useEnhancedTransactionData({
    startDate: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
    endDate: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
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
      .filter(t => t.type?.toLowerCase() === 'credit')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = filteredTransactions
      .filter(t => t.type?.toLowerCase() === 'debit')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const savings = filteredTransactions
      .filter(t => t.type?.toLowerCase() === 'savings')
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

  const { toast } = useToast();

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



    toast({
      title: "Report Exported",
      description: "Your financial report has been downloaded as CSV.",
    });
  };

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      let yPosition = margin;

      // Title
      pdf.setFontSize(20);
      pdf.setTextColor(59, 130, 246); // blue-500
      pdf.text("Financial Report", margin, yPosition);
      yPosition += 10;

      // Date range
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.text(
        `Period: ${format(dateFrom, 'MMM dd, yyyy')} - ${format(dateTo, 'MMM dd, yyyy')}`,
        margin,
        yPosition
      );
      yPosition += 10;

      // Summary metrics
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Summary", margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.text(`Total Income: ${currency.symbol}${formatAmount(summaryMetrics.income)}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Total Expenses: ${currency.symbol}${formatAmount(summaryMetrics.expenses)}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Total Savings: ${currency.symbol}${formatAmount(summaryMetrics.savings)}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Net Balance: ${currency.symbol}${formatAmount(summaryMetrics.net)}`, margin, yPosition);
      yPosition += 12;

      // Category breakdown
      pdf.setFontSize(14);
      pdf.text("Category Breakdown", margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      categoryData.slice(0, 10).forEach((cat) => {
        pdf.text(
          `${cat.category}: ${currency.symbol}${formatAmount(cat.amount)}`,
          margin,
          yPosition
        );
        yPosition += 6;
        if (yPosition > 280) {
          pdf.addPage();
          yPosition = margin;
        }
      });

      pdf.save(`financial-report-${format(dateFrom, 'yyyy-MM-dd')}.pdf`);



      toast({
        title: "PDF Exported",
        description: "Your financial report has been downloaded as PDF.",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };


  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

  const totalAmount = categoryData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Layout>
      <PullToRefresh onRefresh={refreshData} containerClassName="h-full">

        <div className="space-y-6 pb-24">
          <PageHeader
            title="Financial Reports"
            subtitle="Comprehensive analysis of your financial data"
            actions={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="compact" className="flex items-center gap-2">
                    <Download className="mobile-icon-sm" />
                    <span>Download</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={exportData} className="flex items-center gap-2 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Export CSV</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF} className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    <span>Export PDF</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />

          {/* Filters Card */}

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Calendar className="h-4 w-4 text-primary" strokeWidth={1.5} />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Date From */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground/70 px-1 uppercase tracking-wider">
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={dateFrom ? format(dateFrom, 'yyyy-MM-dd') : ''}
                    onChange={(e) => e.target.value && setDateFrom(new Date(e.target.value + 'T00:00:00'))}
                    className="h-10 bg-transparent border-border focus:border-primary/50 transition-colors"
                  />
                </div>

                {/* Date To */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground/70 px-1 uppercase tracking-wider">
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={dateTo ? format(dateTo, 'yyyy-MM-dd') : ''}
                    onChange={(e) => e.target.value && setDateTo(new Date(e.target.value + 'T00:00:00'))}
                    className="h-10 bg-transparent border-border focus:border-primary/50 transition-colors"
                  />
                </div>

                {/* Category Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground/70 px-1 uppercase tracking-wider">Categories</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-10 px-3 border-border text-left justify-between w-full bg-transparent hover:bg-accent/50 transition-colors"
                      >
                        <span className="truncate text-sm font-normal">
                          {selectedCategories.length > 0
                            ? `${selectedCategories.length} Selected`
                            : "All Categories"
                          }
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
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
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground/70 px-1 uppercase tracking-wider">Type</label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="h-10 bg-transparent border-border focus:border-primary/50 transition-colors">
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
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total In</p>
                    <p className="text-lg font-bold text-foreground truncate">
                      {currency.symbol}{formatAmount(summaryMetrics.income)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expenses Card */}
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Out</p>
                    <p className="text-lg font-bold text-foreground truncate">
                      {currency.symbol}{formatAmount(summaryMetrics.expenses)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Savings Card */}
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Savings</p>
                    <p className="text-lg font-bold text-foreground truncate">
                      {currency.symbol}{formatAmount(summaryMetrics.savings)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Net Balance Card */}
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Net Balance</p>
                    <p className={`text-lg font-bold truncate ${summaryMetrics.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
              <Card className="border-border bg-card">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">

                      <BarChart3 className="h-4 w-4 text-white" strokeWidth={1.5} />

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

                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />

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
              <Card className="border-border bg-card">
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
              <Card className="border-border bg-card">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">

                      <PieChart className="h-4 w-4 text-white" strokeWidth={1.5} />

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

                              <YAxis dataKey="category" type="category" tick={{ fontSize: 10 }} />
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
              <Card className="border-border bg-card">
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
                    fetchNextPage={fetchNextPage}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                  />
                </AccordionContent>
              </Card>
            </AccordionItem>

          </Accordion>
        </div>
      </PullToRefresh>
    </Layout>
  );
};

export default ReportsPage;


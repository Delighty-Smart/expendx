import { useState, useMemo } from "react";
import { CalendarIcon, Download, TrendingUp, TrendingDown, DollarSign, BarChart3, FileText, Calendar, PieChart, Shapes, FileSpreadsheet } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  const { user, isLoading: isAuthLoading } = useAuth();
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
    isLoading: isDataLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useEnhancedTransactionData({
    startDate: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
    endDate: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
  });

  const isLoading = isAuthLoading || isDataLoading;

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

  const exportData = async () => {
    try {
      toast({
        title: "Exporting Data",
        description: "Fetching all transactions for your report...",
      });

      if (!user?.id) {
        throw new Error("User not authenticated. Please log in and try again.");
      }

      // Fetch ALL transactions for the period
      const { data: allTransactions, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", format(dateFrom, 'yyyy-MM-dd'))
        .lte("date", format(dateTo, 'yyyy-MM-dd'))
        .order("date", { ascending: false });

      if (fetchError) throw fetchError;

      const csvContent = [
        ['Date', 'Amount', 'Type', 'Category', 'Description'],
        ...(allTransactions || []).map(t => [
          t.date ? format(new Date(t.date), 'yyyy-MM-dd') : '-',
          String(t.amount || 0),
          t.type || '-',
          t.category || '-',
          t.description || ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expendX_Export_${format(dateFrom, 'yyyy-MM-dd')}_to_${format(dateTo, 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report Exported",
        description: "Your financial data has been downloaded as CSV.",
      });
    } catch (error: any) {
      console.error("CSV export error:", error);
      toast({
        title: "Export Failed",
        description: `Failed to generate CSV: ${error.message || 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const exportToPDF = async () => {
    try {
      toast({
        title: "Preparing Report",
        description: "Please wait while we generate your comprehensive report...",
      });

      if (!user?.id) {
        throw new Error("User not authenticated. Please log in and try again.");
      }

      // 1. Fetch ALL transactions for the selected period (bypassing infinite scroll)
      const { data: allTransactions, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", format(dateFrom, 'yyyy-MM-dd'))
        .lte("date", format(dateTo, 'yyyy-MM-dd'))
        .order("date", { ascending: false });

      if (fetchError) throw fetchError;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Helper for drawing footers
      const drawFooter = (pageNum: number) => {
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Generated by expendX | Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: "center" });
      };

      // --- PAGE 1: COVER & SUMMARY ---
      pdf.setFontSize(22);
      pdf.setTextColor(37, 99, 235); // primary blue
      pdf.text("Financial Intelligence Report", margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Reporting Period: ${format(dateFrom, 'MMMM dd, yyyy')} - ${format(dateTo, 'MMMM dd, yyyy')}`,
        margin,
        yPosition
      );
      yPosition += 15;

      // Summary Grid
      pdf.setDrawColor(240, 240, 240);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, yPosition, pageWidth - (margin * 2), 40, 3, 3, "FD");

      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Executive Summary", margin + 5, yPosition + 10);

      pdf.setFontSize(10);
      const summaryStats = [
        { label: "Total Income:", value: `${currency.symbol}${formatAmount(summaryMetrics.income)}`, color: [16, 185, 129] },
        { label: "Total Expenses:", value: `${currency.symbol}${formatAmount(summaryMetrics.expenses)}`, color: [239, 68, 68] },
        { label: "Total Savings:", value: `${currency.symbol}${formatAmount(summaryMetrics.savings)}`, color: [59, 130, 246] },
        { label: "Net Cash Flow:", value: `${currency.symbol}${formatAmount(summaryMetrics.net)}`, color: summaryMetrics.net >= 0 ? [16, 185, 129] : [239, 68, 68] }
      ];

      summaryStats.forEach((stat, i) => {
        pdf.setTextColor(100, 100, 100);
        pdf.text(stat.label, margin + 10, yPosition + 20 + (i * 6));
        pdf.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
        pdf.text(stat.value, margin + 60, yPosition + 20 + (i * 6));
      });

      yPosition += 55;

      // --- CHARTS SECTION ---
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.text("Visual Analytics", margin, yPosition);
      yPosition += 10;

      const chartIds = [
        { id: 'overview-chart-container', title: 'Daily Trends (Income vs Expenses)' },
        { id: 'distribution-chart-container', title: 'Expense Allocation by Category' },
        { id: 'trends-chart-container', title: 'Cumulative Balance Trends' },
        { id: 'top-categories-chart-container', title: 'Top Spending Categories' }
      ];

      for (const chart of chartIds) {
        const element = document.getElementById(chart.id);
        if (element) {
          try {
            const canvas = await html2canvas(element, {
              scale: 2,
              backgroundColor: null,
              logging: false,
              useCORS: true
            });
            const imgData = canvas.toDataURL('image/png');

            // Check for page overflow
            if (yPosition + 70 > pageHeight - 20) {
              drawFooter(pdf.internal.pages.length - 1);
              pdf.addPage();
              yPosition = margin;
            }

            pdf.setFontSize(10);
            pdf.setTextColor(70, 70, 70);
            pdf.text(chart.title, margin, yPosition);
            yPosition += 5;

            const imgWidth = pageWidth - (margin * 2);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, Math.min(imgHeight, 60));
            yPosition += Math.min(imgHeight, 60) + 15;
          } catch (e) {
            console.warn(`Failed to capture chart ${chart.id}`, e);
          }
        }
      }

      // --- TRANSACTION LEDGER ---
      drawFooter(pdf.internal.pages.length - 1);
      pdf.addPage();
      yPosition = margin;

      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Transaction Ledger", margin, yPosition);
      yPosition += 10;

      // Table Header
      pdf.setFillColor(241, 245, 249);
      pdf.rect(margin, yPosition, pageWidth - (margin * 2), 8, "F");
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("Date", margin + 2, yPosition + 5);
      pdf.text("Category", margin + 30, yPosition + 5);
      pdf.text("Description", margin + 70, yPosition + 5);
      pdf.text("Type", margin + 140, yPosition + 5);
      pdf.text("Amount", pageWidth - margin - 2, yPosition + 5, { align: "right" });

      yPosition += 12;
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(50, 50, 50);

      // Table Rows
      (allTransactions || []).forEach((t, index) => {
        if (yPosition > pageHeight - 20) {
          drawFooter(pdf.internal.pages.length - 1);
          pdf.addPage();
          yPosition = margin + 10;
        }

        const dateStr = t.date ? format(new Date(t.date), 'MMM dd, yyyy') : '-';
        const amountStr = `${currency.symbol}${Number(t.amount || 0).toLocaleString()}`;

        pdf.text(dateStr, margin + 2, yPosition);
        pdf.text(String(t.category || '-').substring(0, 15), margin + 30, yPosition);
        pdf.text(String(t.description || '-').substring(0, 30), margin + 70, yPosition);

        pdf.setTextColor(t.type === 'credit' ? 16 : 239, t.type === 'credit' ? 185 : 68, t.type === 'credit' ? 129 : 68);
        const typeStr = String(t.type || 'N/A').toUpperCase();
        pdf.text(typeStr, margin + 140, yPosition);

        pdf.setTextColor(50, 50, 50);
        pdf.text(amountStr, pageWidth - margin - 2, yPosition, { align: "right" });

        // Zebra striping
        if (index % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, yPosition + 2, pageWidth - (margin * 2), 0.1, "F");
        }

        yPosition += 7;
      });

      drawFooter(pdf.internal.pages.length - 1);
      pdf.save(`expendX_Report_${format(dateFrom, 'yyyy-MM-dd')}_to_${format(dateTo, 'yyyy-MM-dd')}.pdf`);

      toast({
        title: "Success",
        description: "Your report has been generated successfully.",
      });
    } catch (error: any) {
      console.error("PDF export error:", error);
      toast({
        title: "Export Failed",
        description: `Failed to generate report: ${error.message || 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    }
  };


  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

  const totalAmount = categoryData.reduce((sum, item) => sum + item.amount, 0);

  return (
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
                    {isLoading ? <Skeleton className="h-6 w-28 mt-0.5" /> : <>{currency.symbol}{formatAmount(summaryMetrics.income)}</>}
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
                    {isLoading ? <Skeleton className="h-6 w-28 mt-0.5" /> : <>{currency.symbol}{formatAmount(summaryMetrics.expenses)}</>}
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
                    {isLoading ? <Skeleton className="h-6 w-28 mt-0.5" /> : <>{currency.symbol}{formatAmount(summaryMetrics.savings)}</>}
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
                    {isLoading ? <Skeleton className="h-6 w-28 mt-0.5" /> : <>{currency.symbol}{formatAmount(summaryMetrics.net)}</>}
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
                <div className="h-80" id="overview-chart-container">
                  <ResponsiveContainer width="100%" height="100%" id="overview-chart">
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
                <div className="h-80" id="trends-chart-container">
                  <ResponsiveContainer width="100%" height="100%" id="trends-chart">
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
                        <div className="h-64" id="distribution-chart-container">
                          <ResponsiveContainer width="100%" height="100%" id="distribution-chart">
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
                      <div className="h-80" id="top-categories-chart-container">
                        <ResponsiveContainer width="100%" height="100%" id="top-categories-chart">
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
  );
};

export default ReportsPage;


import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useBudgetAlerts } from "@/hooks/useBudgetAlerts";
import { Card, GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, PlusCircle, Plus, TrendingUp, Target, PiggyBank, Wallet, TrendingDown, BarChart3, AreaChart, LineChart, ChevronLeft, ChevronRight, Flame, Eye, EyeOff, DollarSign } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useTransactionData } from "@/hooks/useTransactionData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BudgetProgress } from "@/components/BudgetProgress";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRefresh } from "@/hooks/useRefresh";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { updateUserStreak } from "@/lib/streak";
import { startOfMonth, endOfMonth, addWeeks, subWeeks, eachDayOfInterval, format } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie, Sector, AreaChart as RechartAreaChart, Area, LineChart as RechartLineChart, Line } from "recharts";
import { cn } from "@/lib/utils";
import StreakModal from "@/components/StreakModal";

// Transaction types
interface TransactionData {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: TransactionType;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

type TransactionType = "credit" | "debit" | "savings";

// Function to navigate to Add Transaction page
const handleAddTransaction = () => {
  window.location.href = '/add-transaction';
};

const IndexPage = () => {
  const { currency } = useSettings();
  const navigate = useNavigate();
  const { refreshData } = useRefresh();
  
  // Enable smart budget alerts
  useBudgetAlerts();
  
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredLegendItem, setHoveredLegendItem] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [hideAmounts, setHideAmounts] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [showStreakModal, setShowStreakModal] = useState(false);

  const today = new Date();
  const firstDayOfMonth = startOfMonth(today).toISOString();
  const lastDayOfMonth = endOfMonth(today).toISOString();

  // Utility function for formatting amounts with commas
  const formatAmount = (amount: number) => {
    if (hideAmounts) {
      return "***";
    }
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Query to fetch the estimated monthly income
  const { data: monthlyIncomeData, isLoading: isMonthlyIncomeLoading } = useQuery({
    queryKey: ["monthly_income_estimate"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("monthly_income_estimates")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (error) throw error;
      return data?.amount || 0;
    },
  });

  // Get the monthly income value (with fallback to 0)
  const monthlyIncome = monthlyIncomeData || 0;

  const { data: streakData, isLoading: isStreakLoading, refetch: refetchStreak } = useQuery({
    queryKey: ["user_streak"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      await updateUserStreak();

      const { data, error } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (error) throw error;
      return data;
    },
  });

  // Query for monthly transactions (ONLY unarchived)
  const { data: monthlyTransactionsData, refetch: refetchMonthlyTransactions } = useQuery({
    queryKey: ["transactions", "monthly", firstDayOfMonth, lastDayOfMonth],
    queryFn: async () => {
      console.log("Dashboard: Fetching UNARCHIVED transactions for date range:", firstDayOfMonth, "to", lastDayOfMonth);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", false) // ONLY unarchived transactions
        .gte("date", firstDayOfMonth)
        .lte("date", lastDayOfMonth)
        .order("date", { ascending: false });

      if (error) throw error;
      console.log(`Dashboard: Found ${data?.length || 0} UNARCHIVED transactions in the current month`);
      return data as TransactionData[] || [];
    },
  });

  // Query for ALL unarchived transactions (for wallet balance)
  const { data: allTransactionsData } = useQuery({
    queryKey: ["all_transactions", "unarchived"],
    queryFn: async () => {
      console.log("Dashboard: Fetching ALL UNARCHIVED transactions for wallet balance");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", false) // ONLY unarchived transactions
        .order("date", { ascending: false });

      if (error) throw error;
      console.log(`Dashboard: Found ${data?.length || 0} UNARCHIVED transactions in total`);
      return data as TransactionData[] || [];
    },
  });

  const transactions = (monthlyTransactionsData || []).map(transaction => ({
    ...transaction,
    type: transaction.type as TransactionType
  }));

  const allTransactions = (allTransactionsData || []).map(transaction => ({
    ...transaction,
    type: transaction.type as TransactionType
  }));

  // Set up realtime subscription to transactions
  useRealtimeSubscription(
    'transactions',
    '*',
    (payload) => {
      console.log('Transaction changes detected:', payload);
      // Invalidate all transaction-related queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["all_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    }
  );

  const handleTransactionAdded = () => {
    refetchMonthlyTransactions();
    queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
    queryClient.invalidateQueries({ queryKey: ["all_transactions"] });
  };

  // All calculations now use only unarchived transactions
  const calculateMonthlyIncome = () => {
    return transactions
      ?.filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  };

  const calculateMonthlyExpenses = () => {
    return transactions
      ?.filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  };

  const calculateMonthlySavings = () => {
    return transactions
      ?.filter((t) => t.type === "savings")
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  };

  // Calculate all-time income from unarchived transactions only
  const calculateTotalIncome = () => {
    return allTransactions
      ?.filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  };

  // Calculate all-time expenses from unarchived transactions only
  const calculateTotalExpenses = () => {
    return allTransactions
      ?.filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  };

  // Calculate all-time savings from unarchived transactions only
  const calculateTotalSavings = () => {
    return allTransactions
      ?.filter((t) => t.type === "savings")
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  };

  const monthlyIncomeTotal = calculateMonthlyIncome();
  const monthlyExpenses = calculateMonthlyExpenses();
  const monthlySavings = calculateMonthlySavings();
  
  // Calculate wallet balance based on all-time UNARCHIVED transactions only
  // Wallet Balance = Total Income (unarchived) - Total Expenses (unarchived) - Total Savings (unarchived)
  const currentBalance = calculateTotalIncome() - calculateTotalExpenses() - calculateTotalSavings();
  
  const progressPercentage = monthlyIncome > 0 
    ? Math.min((monthlyIncomeTotal / monthlyIncome) * 100, 100) 
    : 0;

  // Spending by category calculation - only unarchived transactions
  const spendingByCategory = transactions
    ?.filter((t) => t.type === "debit")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const spendingData = Object.entries(spendingByCategory || {})
    .map(([name, amount]) => ({
      name,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Daily spending data - only unarchived transactions
  const getDailySpendingData = () => {
    if (!transactions?.length) return [];

    const startDate = currentWeekStart;
    const endDate = addWeeks(startDate, 1);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      const dayIncomes = transactions
        .filter(t => t.type === 'credit' && t.date.startsWith(dayStr))
        .reduce((sum, t) => sum + t.amount, 0);
      
      const dayExpenses = transactions
        .filter(t => t.type === 'debit' && t.date.startsWith(dayStr))
        .reduce((sum, t) => sum + t.amount, 0);
      
      return {
        date: format(day, 'dd'),
        fullDate: format(day, 'MMM dd'),
        income: dayIncomes,
        expense: dayExpenses
      };
    });
  };

  const scrollToPreviousWeek = () => {
    setCurrentWeekStart(prevDate => subWeeks(prevDate, 1));
  };

  const scrollToNextWeek = () => {
    const nextWeek = addWeeks(currentWeekStart, 1);
    if (nextWeek <= new Date()) {
      setCurrentWeekStart(nextWeek);
    }
  };

  const dailyData = getDailySpendingData();

  // Trend data calculation - only unarchived transactions
  const getTrendData = () => {
    if (!transactions?.length) return [];

    const today = new Date();
    const startDate = startOfMonth(today);
    const endDate = endOfMonth(today);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    let runningBalance = 0;
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      const dayTransactions = transactions.filter(t => t.date.startsWith(dayStr));
      
      const dayIncome = dayTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const dayExpense = dayTransactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const daySavings = dayTransactions
        .filter(t => t.type === 'savings')
        .reduce((sum, t) => sum + t.amount, 0);
      
      runningBalance += dayIncome - dayExpense - daySavings;
      
      return {
        date: format(day, 'dd'),
        balance: runningBalance
      };
    });
  };

  const trendData = getTrendData();

  const COLORS = ["#00AAFF", "#A3CE22", "#4B5563", "#9CA3AF", "#F59E0B"];

  useEffect(() => {
    const charts = document.querySelectorAll('.chart-container');
    charts.forEach(chart => {
      chart.classList.remove('opacity-0');
      chart.classList.add('opacity-100');
    });
  }, [transactions]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    
    return (
      <g>
        <text x={cx} y={cy - 15} dy={8} textAnchor="middle" fill="#888888" fontSize={12}>
          {payload.name}
        </text>
        <text x={cx} y={cy + 5} dy={8} textAnchor="middle" fill={fill} fontSize={18} fontWeight="bold">
          {currency.symbol}{formatAmount(value)}
        </text>
        <text x={cx} y={cy + 25} dy={8} textAnchor="middle" fill="#888888" fontSize={12}>
          {`${(percent * 100).toFixed(0)}%`}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.3}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  // Calculate total amount for percentage calculations
  const totalSpendingAmount = spendingData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Layout>
      <PullToRefresh onRefresh={refreshData} containerClassName="h-full">
        <div className="space-y-6 pb-20">
          {/* Floating Action Button */}
          <button
            onClick={() => navigate("/add-transaction")}
            className="fixed bottom-20 right-6 lg:bottom-6 lg:right-6 z-30 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/50 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 touch-manipulation animate-fade-in"
            aria-label="Add transaction"
          >
            <Plus className="h-6 w-6" />
          </button>

          <div className="sticky top-14 lg:top-0 z-20 bg-background pb-4 mb-4 border-b border-border/50 flex flex-wrap gap-4 justify-between">
            <Button
              size="compact"
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-200 touch-manipulation"
              onClick={() => navigate('/add-transaction')}
            >
              <PlusCircle className="mobile-icon-sm" />
              <span className="hidden sm:inline">Add Transaction</span>
              <span className="sm:hidden">Add</span>
            </Button>
            <div className="flex items-center gap-4">
              {streakData && (
                <div
                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500 to-red-500 rounded-full text-white shadow-lg cursor-pointer transition hover:scale-105"
                  onClick={() => setShowStreakModal(true)}
                  title="View Streak Progress"
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") setShowStreakModal(true);
                  }}
                >
                  <Flame className="h-5 w-5 animate-pulse text-yellow-200" />
                  <span className="text-sm font-bold">{streakData.current_streak}</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHideAmounts(!hideAmounts)}
                className="text-muted-foreground hover:text-foreground"
                title={hideAmounts ? "Show amounts" : "Hide amounts"}
              >
                {hideAmounts ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Streak Modal Popup */}
          <StreakModal
            open={showStreakModal}
            onOpenChange={setShowStreakModal}
            streak={streakData}
          />

          {/* Cards section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Wallet Balance Card - Using Glass Card Style */}
            <GlassCard className="p-6 animate-float hover:scale-105 transition-transform duration-200 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border border-border/50">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shadow-lg">
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                  {currentBalance > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      +
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Wallet Balance</p>
                  <p className="text-2xl font-bold text-foreground">{currency.symbol}{formatAmount(currentBalance)}</p>
                  <div className="mt-2 h-1 w-36 bg-muted/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${currentBalance / (monthlyIncome || 1) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Monthly Income Card - Using Glass Card Style */}
            <GlassCard className="p-6 animate-float [animation-delay:200ms] hover:scale-105 transition-transform duration-200 bg-gradient-to-br from-secondary/5 to-secondary/10 dark:from-secondary/10 dark:to-secondary/20 border border-border/50">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/10 dark:bg-secondary/20 flex items-center justify-center shadow-lg">
                    <TrendingUp className="h-8 w-8 text-secondary" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Monthly Income</p>
                  <p className="text-2xl font-bold text-secondary">{currency.symbol}{formatAmount(monthlyIncomeTotal)}</p>
                  {monthlyIncome > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-1 w-24 bg-muted/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-secondary rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {progressPercentage.toFixed(0)}% of est. {currency.symbol}{hideAmounts ? "***" : formatAmount(monthlyIncome)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>

            {/* Monthly Expenses Card - Using Glass Card Style */}
            <GlassCard className="p-6 animate-float [animation-delay:400ms] hover:scale-105 transition-transform duration-200 bg-gradient-to-br from-destructive/5 to-destructive/10 dark:from-destructive/10 dark:to-destructive/20 border border-border/50">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-destructive/10 dark:bg-destructive/20 flex items-center justify-center shadow-lg">
                    <TrendingDown className="h-8 w-8 text-destructive" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-sm">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Monthly Expenses</p>
                  <p className="text-2xl font-bold text-destructive">{currency.symbol}{formatAmount(monthlyExpenses)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="h-1 w-24 bg-muted/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-destructive rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {monthlyIncome > 0 
                        ? `${((monthlyExpenses / monthlyIncome) * 100).toFixed(0)}% of income`
                        : 'No income estimate'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Charts section - All using glass card style */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending by Category Chart */}
            <GlassCard className="p-6 chart-container transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5 text-primary" />
                Spending by Category
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={spendingData} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    barSize={50}
                    layout="vertical"
                  >
                    <defs>
                      {COLORS.map((color, index) => (
                        <linearGradient key={`bar-gradient-${index}`} id={`bar-gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={true} vertical={false} />
                    <YAxis 
                      dataKey="name" 
                      type="category"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                      width={120}
                    />
                    <XAxis 
                      type="number"
                      tickFormatter={(value) => hideAmounts ? '***' : `${currency.symbol}${formatAmount(value)}`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [hideAmounts ? '***' : `${currency.symbol}${formatAmount(value)}`, "Amount"]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(229, 231, 235, 0.5)",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      }}
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                    />
                    <Bar 
                      dataKey="amount" 
                      animationDuration={1500}
                      animationEasing="ease-out"
                      radius={[0, 4, 4, 0]}
                    >
                      {spendingData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`url(#bar-gradient-${index % COLORS.length})`}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Daily Income & Expenses Chart */}
            <GlassCard className="p-6 chart-container transition-opacity duration-500 bg-gradient-to-br from-blue-500/5 to-blue-500/10 dark:from-blue-500/10 dark:to-blue-500/20 border border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                <AreaChart className="h-5 w-5 text-primary" />
                Daily Income & Expenses
              </h3>
              <div className="h-[300px] relative">
                <div className="absolute top-0 right-0 flex items-center gap-2 z-10">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={scrollToPreviousWeek} 
                    className="h-8 w-8 p-0"
                    aria-label="Previous Week"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={scrollToNextWeek} 
                    className="h-8 w-8 p-0"
                    aria-label="Next Week"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <div className="text-center text-sm text-muted-foreground mt-2">
                  Week of {format(currentWeekStart, 'MMMM d, yyyy')}
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartAreaChart data={dailyData} margin={{ top: 40, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="income-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#A3CE22" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#A3CE22" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="expense-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00AAFF" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#00AAFF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      dataKey="fullDate" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                    />
                    <YAxis 
                      tickFormatter={(value)=> hideAmounts ? '***' : `${currency.symbol}${formatAmount(value)}`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [hideAmounts ? '***' : `${currency.symbol}${formatAmount(value)}`, ""]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(229, 231, 235, 0.5)",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      name="Income"
                      stroke="#A3CE22" 
                      fillOpacity={1} 
                      fill="url(#income-gradient)"
                      strokeWidth={2}
                      activeDot={{ r: 6, stroke: "#A3CE22", strokeWidth: 2, fill: "white" }}
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expense" 
                      name="Expense"
                      stroke="#00AAFF" 
                      fillOpacity={1} 
                      fill="url(#expense-gradient)"
                      strokeWidth={2}
                      activeDot={{ r: 6, stroke: "#00AAFF", strokeWidth: 2, fill: "white" }}
                      animationDuration={1500}
                      animationEasing="ease-out"
                      animationBegin={300}
                    />
                  </RechartAreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Balance Trend Chart */}
            <GlassCard className="p-6 chart-container transition-opacity duration-500 bg-gradient-to-br from-green-500/5 to-green-500/10 dark:from-green-500/10 dark:to-green-500/20 border border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                <LineChart className="h-5 w-5 text-primary" />
                Balance Trend
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartLineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => hideAmounts ? '***' : `${currency.symbol}${formatAmount(value)}`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [hideAmounts ? '***' : `${currency.symbol}${formatAmount(value)}`, "Balance"]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(229, 231, 235, 0.5)",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#00AAFF" 
                      strokeWidth={3}
                      connectNulls={true}
                      dot={false}
                      activeDot={{ r: 6, stroke: "#00AAFF", strokeWidth: 2, fill: "white" }}
                      animationDuration={2000}
                      animationEasing="ease-out"
                    />
                  </RechartLineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Expense Distribution Chart */}
            <GlassCard className="p-6 chart-container transition-opacity duration-500 bg-gradient-to-br from-purple-500/5 to-purple-500/10 dark:from-purple-500/10 dark:to-purple-500/20 border border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5 text-primary" />
                Expense Distribution
              </h3>
              <div className="space-y-4">
                {/* Pie Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {COLORS.map((color, index) => (
                          <linearGradient key={`pie-gradient-${index}`} id={`pie-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.8} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={spendingData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="amount"
                        animationBegin={0}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        {spendingData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={`url(#pie-gradient-${index % COLORS.length})`}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                            opacity={hoveredLegendItem === null || hoveredLegendItem === entry.name ? 1 : 0.3}
                            className="hover:opacity-90 transition-opacity"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [hideAmounts ? '***' : `${currency.symbol}${formatAmount(value)}`, `${((value / totalSpendingAmount) * 100).toFixed(1)}%`]}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          borderRadius: "0.5rem",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                          border: "1px solid rgba(0, 0, 0, 0.05)",
                          padding: "0.5rem 1rem"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Interactive Legend */}
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {spendingData.map((entry, index) => {
                    const percentage = totalSpendingAmount > 0 ? ((entry.amount / totalSpendingAmount) * 100).toFixed(1) : '0';
                    return (
                      <div
                        key={entry.name}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200",
                          "hover:bg-slate-100 dark:hover:bg-slate-700",
                          hoveredLegendItem === entry.name && "bg-slate-100 dark:bg-slate-700 shadow-sm"
                        )}
                        onMouseEnter={() => setHoveredLegendItem(entry.name)}
                        onMouseLeave={() => setHoveredLegendItem(null)}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium text-sm">{entry.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">
                            {hideAmounts ? '***' : `${currency.symbol}${formatAmount(entry.amount)}`}
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
            </GlassCard>

          </div>
        </div>
      </PullToRefresh>
    </Layout>
  );
};

export default IndexPage;

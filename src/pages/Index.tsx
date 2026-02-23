import { useState, useEffect, useCallback, useRef } from "react";

import { createPortal } from "react-dom";

import { useNavigate } from "react-router-dom";
import { useBudgetAlerts } from "@/hooks/useBudgetAlerts";
import { Card, GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/hooks/useAuth";
import { Maximize2, ArrowUpRight, ArrowDownRight, PlusCircle, Plus, TrendingUp, Target, PiggyBank, Wallet, TrendingDown, BarChart3, AreaChart, LineChart, PieChart, ChevronLeft, ChevronRight, Flame, Eye, EyeOff, DollarSign, User, Bell, Receipt, CreditCard } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BudgetProgress } from "@/components/BudgetProgress";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRefresh } from "@/hooks/useRefresh";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { updateUserStreak } from "@/lib/streak";
import { startOfMonth, endOfMonth, addWeeks, subWeeks, eachDayOfInterval, format } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart as RechartPieChart, Pie, Sector, AreaChart as RechartAreaChart, Area, LineChart as RechartLineChart, Line } from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import StreakModal from "@/components/StreakModal";
import UserAvatar from "@/components/UserAvatar";
import { getUserProfile } from "@/lib/streak";
import { useEnhancedTransactionData } from "@/hooks/useEnhancedTransactionData";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";
import FullscreenChartModal from "@/components/charts/FullscreenChartModal";
import SpendingByCategoryChart from "@/components/charts/SpendingByCategoryChart";
import DailyIncomeExpensesChart from "@/components/charts/DailyIncomeExpensesChart";
import BalanceTrendChart from "@/components/charts/BalanceTrendChart";
import ExpenseDistributionChart from "@/components/charts/ExpenseDistributionChart";

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

// Function to handle adding transactions relocated inside component to use navigate

const IndexPage = () => {
  const { user, profile } = useAuth();
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
  const [fullscreenChartId, setFullscreenChartId] = useState<string | null>(null);

  const [unreadAlerts, setUnreadAlerts] = useState(0);


  const today = new Date();
  const firstDayOfMonth = format(startOfMonth(today), 'yyyy-MM-dd');
  const lastDayOfMonth = format(endOfMonth(today), 'yyyy-MM-dd');


  // Fetch unread alerts
  useEffect(() => {
    const fetchUnreadAlerts = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('id')
          .eq('user_id', user.id)
          .eq('read', false);

        if (error) throw error;
        setUnreadAlerts(data?.length || 0);
      } catch (error) {
        console.error('Error fetching unread alerts:', error);
      }
    };

    fetchUnreadAlerts();
  }, [user]);


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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Query to fetch the estimated monthly income
  const { data: monthlyIncomeData, isLoading: isMonthlyIncomeLoading } = useQuery({
    queryKey: ["monthly_income", user?.id],
    enabled: !!user,
    queryFn: async () => {
      console.log("Fetching monthly income estimate...");
      const { data, error } = await supabase
        .from("monthly_income_estimates")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data?.amount || 0;
    },
  });

  // Get the monthly income value (with fallback to 0)
  const monthlyIncome = monthlyIncomeData || 0;

  const { data: streakData, isLoading: isStreakLoading, refetch: refetchStreak } = useQuery({
    queryKey: ["user_streak", user?.id],
    enabled: !!user,
    queryFn: async () => {
      console.log("Fetching user streak...");
      const { data, error } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Removed local userProfile query as it's now handled globally by useAuth

  // Dashboard data - fetch current month's transactions
  const {
    transactions: transactionsData,
    isLoading: isMonthlyTransactionsLoading,
    refetch: refetchMonthlyTransactions
  } = useEnhancedTransactionData({
    startDate: firstDayOfMonth,
    endDate: lastDayOfMonth,
    includeArchived: false
  });

  // For the balance, we use the offline manager's summary which is instant and always present
  const [totals, setTotals] = useState(() => enhancedOfflineManager.getTransactionSummary());

  // Update totals whenever transactions change or on mount
  useEffect(() => {
    setTotals(enhancedOfflineManager.getTransactionSummary());
  }, [transactionsData]);

  const currentBalance = totals.balance;
  const totalSavings = totals.totalSavings;
  const isAllTransactionsLoading = isMonthlyTransactionsLoading && !totals.balance;

  // Set up realtime subscription to transactions
  useRealtimeSubscription(
    'transactions',
    '*',
    (payload) => {
      console.log('Transaction changes detected:', payload);
      queryClient.invalidateQueries({ queryKey: ["enhanced_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
    user ? { column: 'user_id', value: user.id } : undefined
  );

  const handleTransactionAdded = () => {
    refetchMonthlyTransactions();
    queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
  };

  const transactions = transactionsData || [];

  // Monthly totals calculated from the current filtered transactionsData
  const monthlyIncomeTotal = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = transactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlySavings = transactions
    .filter((t) => t.type === "savings")
    .reduce((sum, t) => sum + t.amount, 0);

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

  // Fetch total budget for expense percentage calculation
  const { data: totalBudget } = useQuery({
    queryKey: ["total_budget", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("monthly_limit")
        .eq("user_id", user!.id);

      if (error) throw error;
      return data?.reduce((sum, item) => sum + item.monthly_limit, 0) || 0;
    },
  });

  const incomeProgress = monthlyIncome > 0
    ? Math.min((monthlyIncomeTotal / monthlyIncome) * 100, 100)
    : 0;

  const expenseProgress = totalBudget && totalBudget > 0
    ? Math.min((monthlyExpenses / totalBudget) * 100, 100)
    : 0;

  // ... (keeping existing charts setup)

  // Calculate total amount for percentage calculations
  const totalSpendingAmount = spendingData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <PullToRefresh onRefresh={refreshData} containerClassName="h-full">

      <div className="space-y-6 pb-20 px-4 md:px-0">
        {/* Header Area - Hidden on mobile */}
        <div className="hidden lg:flex items-center justify-between pt-4 pb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {getGreeting()}, {profile?.first_name || profile?.username || "there"}
            </h1>
            <p className="text-sm text-muted-foreground">{format(today, 'EEEE, MMMM do')}</p>
          </div>
          <div className="flex items-center gap-2">
            {streakData && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:flex rounded-full h-10 gap-1.5 font-bold text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 border border-border/50 bg-muted/30 px-3"
                onClick={() => setShowStreakModal(true)}
              >
                <Flame className="h-5 w-5 fill-current" />
                <span>{streakData.current_streak}</span>
              </Button>
            )}
            <button
              className="rounded-full w-10 h-10 hover:opacity-80 transition-opacity flex items-center justify-center overflow-hidden border border-border/50 shadow-sm"
              onClick={() => navigate('/profile')}
            >
              <UserAvatar
                url={profile?.avatar_url}
                name={profile?.username || profile?.email || "User"}
                className="w-full h-full"
                showDefaultGradient={false}
              />
            </button>
            <div className="relative">
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full w-10 h-10 bg-muted text-foreground hover:bg-muted/80 shadow-none border border-border/50"
                onClick={() => navigate('/alerts')}
              >
                <Bell className="h-5 w-5" strokeWidth={1.5} />
                {unreadAlerts > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 h-7">
              <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-[0.12em] leading-none mb-0">Total Balance</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-accent hover:bg-accent/10 transition-colors"
                onClick={() => setHideAmounts(!hideAmounts)}
              >
                {hideAmounts ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            {/* Mobile-only secondary actions */}
            <div className="flex lg:hidden items-center gap-2">
              {streakData && (
                <Button
                  variant="ghost"
                  size="compact"
                  onClick={() => setShowStreakModal(true)}
                  className="flex items-center gap-1.5 px-2 py-1 h-8 bg-orange-500/10 text-orange-500 font-bold hover:bg-orange-500/20 rounded-lg transition-all"
                >
                  <Flame className="h-4 w-4 fill-current" strokeWidth={2.5} />
                  <span className="text-xs font-black tracking-tight">{streakData.current_streak}</span>
                </Button>
              )}
              <div className="relative">
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full w-8 h-8 bg-muted text-foreground hover:bg-muted/80 shadow-none border border-border/50"
                  onClick={() => navigate('/alerts')}
                >
                  <Bell className="h-4 w-4" strokeWidth={1.5} />
                  {unreadAlerts > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-accent rounded-full border-2 border-background" />}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            {isAllTransactionsLoading ? (
              <Skeleton className="h-10 w-32 mb-1" />
            ) : (
              <>
                <span className="text-[36px] font-semibold tracking-[-0.5px] text-foreground">
                  {currency.symbol}{formatAmount(currentBalance).split('.')[0]}
                </span>
                <span className="text-xl font-medium text-muted-foreground">
                  .{formatAmount(currentBalance).split('.')[1]}
                </span>
              </>
            )}
          </div>

          <div className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
            isMonthlyTransactionsLoading || isMonthlyIncomeLoading
              ? "bg-muted text-muted-foreground"
              : (monthlyIncomeTotal - monthlyExpenses) >= 0
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
          )}>
            {isMonthlyTransactionsLoading || isMonthlyIncomeLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <>
                {(monthlyIncomeTotal - monthlyExpenses) >= 0 ? (
                  <TrendingUp className="h-3 w-3" strokeWidth={1.5} />
                ) : (
                  <TrendingDown className="h-3 w-3" strokeWidth={1.5} />
                )}
                <span>
                  {currency.symbol}{formatAmount(Math.abs(monthlyIncomeTotal - monthlyExpenses))} {(monthlyIncomeTotal - monthlyExpenses) >= 0 ? "Net Income" : "Deficit"} this month
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}

        {/* Floating Action Button (FAB) */}
        {/* Floating Action Button (FAB) - Portaled to escape Layout transforms */}
        {createPortal(
          <Button
            onClick={() => navigate("/add-transaction")}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            size="icon"
          >
            <Plus className="h-6 w-6" strokeWidth={1.5} />
          </Button>,
          document.body
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Monthly Income */}
          <div
            onClick={() => navigate('/set-income')}
            className="p-3 rounded-lg bg-white dark:bg-card border border-border/40 shadow-sm relative overflow-hidden group transition-all hover:shadow-md flex items-center justify-between cursor-pointer active:scale-[0.98]"
          >
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Income</p>
              <p className="text-lg font-bold tracking-tight text-foreground">
                {isMonthlyTransactionsLoading ? (
                  <Skeleton className="h-6 w-20 mt-1" />
                ) : (
                  <>
                    <span className="text-xs font-normal text-muted-foreground mr-0.5">{currency.symbol}</span>
                    {formatAmount(monthlyIncomeTotal)}
                  </>
                )}
              </p>
              {monthlyIncome > 0 && !isMonthlyTransactionsLoading && (
                <p className="text-[10px] text-muted-foreground font-medium mt-1">
                  {incomeProgress.toFixed(0)}% of target
                </p>
              )}
            </div>
            <div className="p-2 bg-green-500/10 rounded-full group-hover:bg-green-500/20 transition-colors self-start">
              <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={2} />
            </div>
          </div>

          {/* Monthly Expenses */}
          <div className="p-3 rounded-lg bg-white dark:bg-card border border-border/40 shadow-sm relative overflow-hidden group transition-all hover:shadow-md flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expenses</p>
              <p className="text-lg font-bold tracking-tight text-foreground">
                {isMonthlyTransactionsLoading ? (
                  <Skeleton className="h-6 w-20 mt-1" />
                ) : (
                  <>
                    <span className="text-xs font-normal text-muted-foreground mr-0.5">{currency.symbol}</span>
                    {formatAmount(monthlyExpenses)}
                  </>
                )}
              </p>
              {totalBudget && totalBudget > 0 && !isMonthlyTransactionsLoading && (
                <p className="text-[10px] text-muted-foreground font-medium mt-1">
                  {expenseProgress.toFixed(0)}% of budget
                </p>
              )}
            </div>
            <div className="p-2 bg-red-500/10 rounded-full group-hover:bg-red-500/20 transition-colors self-start">
              <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400" strokeWidth={2} />
            </div>
          </div>

        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/transactions')}
            className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-card border border-border/40 shadow-sm transition-all hover:bg-muted/50 active:scale-95 group text-left"
          >
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <Receipt className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <span className="font-medium text-foreground text-sm">Transactions</span>
          </button>
          <button
            onClick={() => navigate('/budgets')}
            className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-card border border-border/40 shadow-sm transition-all hover:bg-muted/50 active:scale-95 group text-left"
          >
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <DollarSign className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <span className="font-medium text-foreground text-sm">Budgets</span>
          </button>
          <button
            onClick={() => navigate('/savings')}
            className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-card border border-border/40 shadow-sm transition-all hover:bg-muted/50 active:scale-95 group text-left"
          >
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <PiggyBank className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <span className="font-medium text-foreground text-sm">Savings</span>
          </button>
          <button
            onClick={() => navigate('/subscriptions')}
            className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-card border border-border/40 shadow-sm transition-all hover:bg-muted/50 active:scale-95 group text-left"
          >
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <CreditCard className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <span className="font-medium text-foreground text-sm">Subscriptions</span>
          </button>
        </div>

        {/* Charts section - All using glass card style */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending by Category Chart */}
          <GlassCard className="p-6 chart-container transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5 text-primary" strokeWidth={1.5} />
                Spending by Category
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 rounded-full"
                onClick={() => setFullscreenChartId('spending')}
              >
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <div className="h-[300px]">
              <SpendingByCategoryChart
                data={spendingData}
                hideAmounts={hideAmounts}
                currencySymbol={currency.symbol}
                formatAmount={formatAmount}
                colors={COLORS}
              />
            </div>
          </GlassCard>

          {/* Daily Income & Expenses Chart */}
          <GlassCard className="p-6 chart-container transition-opacity duration-500 bg-gradient-to-br from-blue-500/5 to-blue-500/10 dark:from-blue-500/10 dark:to-blue-500/20 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <AreaChart className="h-5 w-5 text-primary" strokeWidth={1.5} />
                Daily Income & Expenses
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 rounded-full"
                onClick={() => setFullscreenChartId('daily')}
              >
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <div className="h-[300px] relative">
              <div className="flex flex-col space-y-2 mb-4">
                <div className="flex items-center justify-between w-full">
                  <div className="text-sm font-medium text-muted-foreground">
                    Week of {format(currentWeekStart, 'MMMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={scrollToPreviousWeek}
                      className="h-7 w-7 p-0 hover:bg-background"
                      aria-label="Previous Week"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={scrollToNextWeek}
                      className="h-7 w-7 p-0 hover:bg-background"
                      aria-label="Next Week"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={2} />
                    </Button>
                  </div>
                </div>
              </div>
              <DailyIncomeExpensesChart
                data={dailyData}
                hideAmounts={hideAmounts}
                currencySymbol={currency.symbol}
                formatAmount={formatAmount}
              />
            </div>
          </GlassCard>

          {/* Balance Trend Chart */}
          <GlassCard className="p-6 chart-container transition-opacity duration-500 bg-gradient-to-br from-green-500/5 to-green-500/10 dark:from-green-500/10 dark:to-green-500/20 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <LineChart className="h-5 w-5 text-primary" strokeWidth={1.5} />
                Balance Trend
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 rounded-full"
                onClick={() => setFullscreenChartId('trend')}
              >
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <div className="h-[300px]">
              <BalanceTrendChart
                data={trendData}
                hideAmounts={hideAmounts}
                currencySymbol={currency.symbol}
                formatAmount={formatAmount}
              />
            </div>
          </GlassCard>

          {/* Expense Distribution Chart */}
          <GlassCard className="p-6 chart-container transition-opacity duration-500 bg-gradient-to-br from-amber-500/5 to-amber-500/10 dark:from-amber-500/10 dark:to-amber-500/20 border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <PieChart className="h-5 w-5 text-primary" strokeWidth={1.5} />
                Expense Distribution
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/10 rounded-full"
                onClick={() => setFullscreenChartId('distribution')}
              >
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <div className="h-[350px]">
              <ExpenseDistributionChart
                data={spendingData}
                hideAmounts={hideAmounts}
                currencySymbol={currency.symbol}
                formatAmount={formatAmount}
                colors={COLORS}
                totalAmount={totalSpendingAmount}
                hoveredLegendItem={hoveredLegendItem}
                setHoveredLegendItem={setHoveredLegendItem}
              />
            </div>
          </GlassCard>

        </div>
      </div>


      {/* Fullscreen Chart Modal */}
      <FullscreenChartModal
        isOpen={!!fullscreenChartId}
        onClose={() => setFullscreenChartId(null)}
        title={
          fullscreenChartId === 'spending' ? 'Spending by Category' :
            fullscreenChartId === 'daily' ? 'Daily Income & Expenses' :
              fullscreenChartId === 'trend' ? 'Balance Trend' :
                'Expense Distribution'
        }
        icon={
          fullscreenChartId === 'spending' ? <BarChart3 className="h-6 w-6" /> :
            fullscreenChartId === 'daily' ? <AreaChart className="h-6 w-6" /> :
              fullscreenChartId === 'trend' ? <LineChart className="h-6 w-6" /> :
                <PieChart className="h-6 w-6" />
        }
      >
        <div className="w-full h-full p-4 md:p-8">
          {fullscreenChartId === 'spending' && (
            <SpendingByCategoryChart
              data={spendingData}
              hideAmounts={hideAmounts}
              currencySymbol={currency.symbol}
              formatAmount={formatAmount}
              colors={COLORS}
            />
          )}
          {fullscreenChartId === 'daily' && (
            <div className="w-full h-full flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-sm md:text-base font-medium text-muted-foreground bg-muted/30 px-4 py-2 rounded-full">
                  Week of {format(currentWeekStart, 'MMMM d, yyyy')}
                </div>
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={scrollToPreviousWeek}
                    className="h-10 w-10 hover:bg-background rounded-lg"
                  >
                    <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={scrollToNextWeek}
                    className="h-10 w-10 hover:bg-background rounded-lg"
                  >
                    <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
                  </Button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <DailyIncomeExpensesChart
                  data={dailyData}
                  hideAmounts={hideAmounts}
                  currencySymbol={currency.symbol}
                  formatAmount={formatAmount}
                />
              </div>
            </div>
          )}
          {fullscreenChartId === 'trend' && (
            <BalanceTrendChart
              data={trendData}
              hideAmounts={hideAmounts}
              currencySymbol={currency.symbol}
              formatAmount={formatAmount}
            />
          )}
          {fullscreenChartId === 'distribution' && (
            <div className="w-full h-full flex flex-col md:flex-row gap-8 items-center">
              <div className="w-full md:w-2/3 h-full">
                <ExpenseDistributionChart
                  data={spendingData}
                  hideAmounts={hideAmounts}
                  currencySymbol={currency.symbol}
                  formatAmount={formatAmount}
                  colors={COLORS}
                  totalAmount={totalSpendingAmount}
                  hoveredLegendItem={hoveredLegendItem}
                  setHoveredLegendItem={setHoveredLegendItem}
                  showLegend={false}
                />
              </div>
              <div className="w-full md:w-1/3 max-h-[40vh] md:max-h-full overflow-y-auto space-y-3 pr-2 scrollable-container">
                <h4 className="text-lg font-bold mb-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10 py-2">Category Breakdown</h4>
                {spendingData.map((entry, index) => {
                  const percentage = totalSpendingAmount > 0 ? ((entry.amount / totalSpendingAmount) * 100).toFixed(1) : '0';
                  return (
                    <div
                      key={entry.name}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border border-border/10 transition-all duration-300",
                        "hover:bg-primary/5 hover:border-primary/20 hover:-translate-y-0.5 shadow-sm",
                        hoveredLegendItem === entry.name && "bg-primary/5 border-primary/20 scale-[1.02] shadow-md"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full shadow-inner"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-semibold text-base">{entry.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-primary">
                          {hideAmounts ? '***' : `${currency.symbol}${formatAmount(entry.amount)}`}
                        </div>
                        <div className="text-sm font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md inline-block">
                          {percentage}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </FullscreenChartModal>
      <StreakModal
        open={showStreakModal}
        onOpenChange={setShowStreakModal}
        streak={streakData}
      />
    </PullToRefresh >
  );
};

export default IndexPage;


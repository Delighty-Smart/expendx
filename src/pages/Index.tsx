import { useState, useEffect, useCallback, useRef, useMemo } from "react";

import { createPortal } from "react-dom";

import { useNavigate } from "react-router-dom";
import { useBudgetAlerts } from "@/hooks/useBudgetAlerts";
import { Card, GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/hooks/useAuth";
import { Maximize2, ArrowUpRight, ArrowDownRight, PlusCircle, Plus, TrendingUp, Target, PiggyBank, Wallet, TrendingDown, BarChart3, AreaChart, LineChart, PieChart, ChevronLeft, ChevronRight, Flame, Eye, EyeOff, DollarSign, User, Bell, Receipt, CreditCard, ArrowUp, ArrowDown, ArrowDownToLine, ArrowUpFromLine, Repeat, Landmark, Banknote, CirclePlus, Hourglass } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
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
import { useTransactionData } from "@/hooks/useTransactionData";
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

type TransactionType = "credit" | "debit" | "savings" | "subscription";

// Function to handle adding transactions relocated inside component to use navigate

const LifeEnergyIcon = ({ className }: { className?: string }) => (
  <Hourglass className={className} strokeWidth={2.2} />
);

const IndexPage = () => {
  const { user, profile } = useAuth();
  const { currency, theme, showLifeHours, toggleShowLifeHours, trueHourlyRate, formatValue } = useSettings();
  const navigate = useNavigate();
  const { refreshData } = useRefresh();


  // Enable smart budget alerts
  useBudgetAlerts();


  const [hoveredLegendItem, setHoveredLegendItem] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [hideAmounts, setHideAmounts] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [fullscreenChartId, setFullscreenChartId] = useState<string | null>(null);




  const today = new Date();
  const firstDayOfMonth = format(startOfMonth(today), 'yyyy-MM-dd');
  const lastDayOfMonth = format(endOfMonth(today), 'yyyy-MM-dd');


  // Fetch unread alerts via useQuery for proper caching + deduplication
  const { data: unreadAlertsData } = useQuery({
    queryKey: ['unread_alerts', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('id')
        .eq('user_id', user!.id)
        .eq('read', false);
      if (error) throw error;
      return data?.length || 0;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
  const unreadAlerts = unreadAlertsData ?? 0;


  // Memoized formatter — only recreated when hideAmounts changes
  const formatAmount = useCallback((amount: number) => {
    if (hideAmounts) {
      return "***";
    }
    if (showLifeHours) {
      const hrs = amount / trueHourlyRate;
      return hrs.toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }) + " hrs";
    }
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, [hideAmounts, showLifeHours, trueHourlyRate]);



  // Memoized greeting — computed once per mount (changes only ~3×/day)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Query to fetch the estimated monthly income
  const { data: monthlyIncomeData, isLoading: isMonthlyIncomeLoading } = useQuery({
    queryKey: ["monthly_income", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes — income estimates rarely change mid-session
    queryFn: async () => {
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
    staleTime: 1000 * 60 * 5, // 5 minutes — streak data doesn't change every second
    queryFn: async () => {
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

  // Dashboard data - fetch all transactions for accurate statistics and lists
  const {
    transactions: allTransactions = [],
    isLoading: isAllTransactionsLoading,
    refetch: refetchTransactions
  } = useTransactionData({
    includeArchived: false
  });

  const isMonthlyTransactionsLoading = isAllTransactionsLoading;
  const refetchMonthlyTransactions = refetchTransactions;

  // Memoized current month's transactions for monthly totals and charts
  const transactions = useMemo(() => {
    return allTransactions.filter(t => {
      const dateStr = t.date;
      return dateStr >= firstDayOfMonth && dateStr <= lastDayOfMonth;
    });
  }, [allTransactions, firstDayOfMonth, lastDayOfMonth]);

  const transactionsData = transactions;

  // For the balance, we use the offline manager's summary which is instant and always present
  const [totals, setTotals] = useState(() => enhancedOfflineManager.getTransactionSummary());

  // Update totals whenever transactions change or on mount
  useEffect(() => {
    setTotals(enhancedOfflineManager.getTransactionSummary());
  }, [allTransactions]);

  const currentBalance = totals.balance;
  const totalSavings = totals.totalSavings;

  const formattedBalance = useMemo(() => {
    if (hideAmounts) return { primary: "***", secondary: "" };
    if (showLifeHours) {
      const hrs = (currentBalance / trueHourlyRate).toFixed(1);
      return { primary: `${hrs} hrs`, secondary: "" };
    }
    const val = currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const parts = val.split('.');
    return { primary: `${currency.symbol}${parts[0]}`, secondary: `.${parts[1]}` };
  }, [currentBalance, hideAmounts, showLifeHours, trueHourlyRate, currency]);

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

  // Memoized monthly totals — only recalculated when transactions changes
  const { monthlyIncomeTotal, monthlyExpenses, monthlySavings } = useMemo(() => ({
    monthlyIncomeTotal: transactions
      .filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0),
    monthlyExpenses: transactions
      .filter((t) => t.type === "debit" || t.type === "subscription")
      .reduce((sum, t) => sum + t.amount, 0),
    monthlySavings: transactions
      .filter((t) => t.type === "savings")
      .reduce((sum, t) => sum + t.amount, 0),
  }), [transactions]);

  // Mock transactions for beautiful empty dashboard demo visual fallback
  const mockTransactions = useMemo(() => [
    { id: "mock-1", description: "Ada Femi", amount: 1923.00, type: "debit", category: "Transfer", date: "2026-11-12T10:00:00Z" },
    { id: "mock-2", description: "Musa Adebayor", amount: 1532.00, type: "credit", category: "Refund", date: "2026-11-14T12:00:00Z" },
    { id: "mock-3", description: "Nneka Malik", amount: 950.00, type: "debit", category: "Rent", date: "2026-11-12T14:30:00Z" },
    { id: "mock-4", description: "Tunde Ugo", amount: 190.00, type: "debit", category: "Shopping", date: "2026-05-26T09:15:00Z" },
  ], []);

  const getFormattedDate = useCallback((dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Recent";
      return format(d, "MMM d");
    } catch (e) {
      return "Recent";
    }
  }, []);

  const displayTransactions = useMemo(() => {
    if (allTransactions && allTransactions.length > 0) {
      return [...allTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 4);
    }
    return mockTransactions;
  }, [allTransactions, mockTransactions]);

  // Memoized spending data for charts
  const spendingData = useMemo(() => {
    const byCategory = transactions
      .filter((t) => t.type === "debit" || t.type === "subscription")
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(byCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  // Memoized daily spending data — recalculates only when transactions or week changes
  const dailyData = useMemo(() => {
    if (!allTransactions || !allTransactions.length) return [];

    const startDate = currentWeekStart;
    const endDate = addWeeks(startDate, 1);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');

      const dayIncomes = allTransactions
        .filter(t => t.type === 'credit' && t.date.startsWith(dayStr))
        .reduce((sum, t) => sum + t.amount, 0);

      const dayExpenses = allTransactions
        .filter(t => (t.type === 'debit' || t.type === 'subscription') && t.date.startsWith(dayStr))
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        date: format(day, 'dd'),
        fullDate: format(day, 'MMM dd'),
        income: dayIncomes,
        expense: dayExpenses
      };
    });
  }, [allTransactions, currentWeekStart]);

  const scrollToPreviousWeek = () => {
    setCurrentWeekStart(prevDate => subWeeks(prevDate, 1));
  };

  const scrollToNextWeek = () => {
    const nextWeek = addWeeks(currentWeekStart, 1);
    if (nextWeek <= new Date()) {
      setCurrentWeekStart(nextWeek);
    }
  };

  // Memoized trend data — recalculates only when transactions changes
  const trendData = useMemo(() => {
    if (!transactions?.length) return [];

    const now = new Date();
    const startDate = startOfMonth(now);
    const endDate = endOfMonth(now);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    let runningBalance = 0;

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayTransactions = transactions.filter(t => t.date.startsWith(dayStr));

      const dayIncome = dayTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);

      const dayExpense = dayTransactions
        .filter(t => t.type === 'debit' || t.type === 'subscription')
        .reduce((sum, t) => sum + t.amount, 0);

      const daySavings = dayTransactions
        .filter(t => t.type === 'savings')
        .reduce((sum, t) => sum + t.amount, 0);

      runningBalance += dayIncome - dayExpense - daySavings;

      return {
        date: format(day, 'dd'),
        fullDate: format(day, 'MMM d, yyyy'),
        balance: runningBalance
      };
    });
  }, [transactions]);

  const COLORS = theme === "dark"
    ? ["#FFFFFF", "#9CA3AF", "#6B7280", "#4B5563", "#34D399"]
    : ["#111111", "#4B5563", "#9CA3AF", "#D1D5DB", "#10B981"];

  useEffect(() => {
    const charts = document.querySelectorAll('.chart-container');
    charts.forEach(chart => {
      chart.classList.remove('opacity-0');
      chart.classList.add('opacity-100');
    });
  }, [transactions]);

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

  // Memoized progress percentages and total
  const { incomeProgress, expenseProgress, totalSpendingAmount } = useMemo(() => ({
    incomeProgress: monthlyIncome > 0
      ? Math.min((monthlyIncomeTotal / monthlyIncome) * 100, 100)
      : 0,
    expenseProgress: totalBudget && totalBudget > 0
      ? Math.min((monthlyExpenses / totalBudget) * 100, 100)
      : 0,
    totalSpendingAmount: spendingData.reduce((sum, item) => sum + item.amount, 0),
  }), [monthlyIncome, monthlyIncomeTotal, monthlyExpenses, totalBudget, spendingData]);

  return (
    <PullToRefresh onRefresh={refreshData} containerClassName="h-full">

      <div className="space-y-6 pb-20">
        {/* Header Area - Hidden on mobile */}
        <div className="hidden lg:flex items-center justify-between pt-4 pb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {greeting}, {profile?.first_name || profile?.username || "there"}
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
              className="rounded-full w-10 h-10 hover:opacity-80 transition-opacity flex items-center justify-center overflow-hidden border border-border/50"
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

        {/* Fintech Balance Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border-default bg-white dark:bg-card p-4 sm:p-5 group">
          {/* Subtle light reflection and tech grid mesh background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.04),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.02),rgba(0,0,0,0))] pointer-events-none" />
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] leading-none">Total Balance</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors rounded-full"
                  onClick={() => setHideAmounts(!hideAmounts)}
                >
                  {hideAmounts ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-5 w-5 p-0 transition-colors rounded-full",
                    showLifeHours
                      ? "text-primary bg-primary/10 hover:bg-primary/20"
                      : "text-muted-foreground/50 hover:text-foreground hover:bg-muted"
                  )}
                  onClick={toggleShowLifeHours}
                  title="Toggle Life Energy Mode"
                >
                  <LifeEnergyIcon className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Mobile-only secondary actions */}
              <div className="flex lg:hidden items-center gap-1.5">
                {streakData && (
                  <Button
                    variant="ghost"
                    size="compact"
                    onClick={() => setShowStreakModal(true)}
                    className="flex items-center gap-1 px-1.5 py-0.5 h-5 bg-orange-500/10 text-orange-500 font-bold hover:bg-orange-500/20 rounded-full transition-all border border-orange-500/25"
                  >
                    <Flame className="h-3 w-3 fill-current animate-pulse" />
                    <span className="text-[9px] font-black tracking-tight">{streakData.current_streak}</span>
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full w-6.5 h-6.5 bg-muted text-foreground hover:bg-muted/80 shadow-none border border-border/50 flex items-center justify-center"
                  onClick={() => navigate('/alerts')}
                >
                  <Bell className="h-3 w-3" strokeWidth={1.5} />
                  {unreadAlerts > 0 && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-accent rounded-full" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline">
                {isAllTransactionsLoading ? (
                  <Skeleton className="h-9 w-32" />
                ) : (
                  <>
                    <span className="text-2xl sm:text-3xl lg:text-[34px] font-bold tracking-[-0.04em] text-foreground font-numeric leading-none">
                      {formattedBalance.primary}
                    </span>
                    {formattedBalance.secondary && (
                      <span className="text-lg sm:text-xl font-semibold text-muted-foreground/75 font-numeric leading-none ml-1">
                        {formattedBalance.secondary}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Bottom Income/Deficit Badge & Status inside the Card */}
            <div className="flex items-center justify-start pt-3 border-t border-border-default/30">
              <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
                isMonthlyTransactionsLoading || isMonthlyIncomeLoading
                  ? "bg-muted text-muted-foreground border-border-default"
                  : (monthlyIncomeTotal - monthlyExpenses) >= 0
                    ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/10"
                    : "bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/10"
              )}>
                {isMonthlyTransactionsLoading || isMonthlyIncomeLoading ? (
                  <Skeleton className="h-4 w-24" />
                ) : (
                  <>
                    {(monthlyIncomeTotal - monthlyExpenses) >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 stroke-[2]" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 stroke-[2]" />
                    )}
                    <span>
                      {!showLifeHours && currency.symbol}{formatAmount(Math.abs(monthlyIncomeTotal - monthlyExpenses))} {(monthlyIncomeTotal - monthlyExpenses) >= 0 ? "Net Income" : "Deficit"} this month
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}

        {/* Floating Action Button (FAB) */}
        {/* Floating Action Button (FAB) - Portaled to escape Layout transforms */}
        {!Capacitor.isNativePlatform() && createPortal(
          <Button
            onClick={() => navigate("/add-transaction")}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            size="icon"
          >
            <CirclePlus className="h-6 w-6" strokeWidth={1.5} />
          </Button>,
          document.body
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Monthly Income */}
          <div
            onClick={() => navigate('/set-income')}
            className="p-3 md:p-3.5 rounded-xl bg-white dark:bg-card border border-border-default shadow-sm relative overflow-hidden group transition-all hover:shadow-md flex items-center justify-between cursor-pointer active:scale-[0.98]"
          >
            <div className="flex flex-col gap-0.5">
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.12em] leading-none">Income</p>
              <p className="text-lg md:text-xl font-bold tracking-tight text-foreground mt-0.5">
                {isMonthlyTransactionsLoading ? (
                  <Skeleton className="h-5 w-16 mt-0.5" />
                ) : (
                  <>
                    {!showLifeHours && <span className="text-[10px] font-normal text-muted-foreground mr-0.5">{currency.symbol}</span>}
                    {formatAmount(monthlyIncomeTotal)}
                  </>
                )}
              </p>
              {monthlyIncome > 0 && !isMonthlyTransactionsLoading && (
                <p className="text-[9px] text-muted-foreground font-semibold mt-0.5 bg-emerald-500/5 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full w-fit">
                  {incomeProgress.toFixed(0)}% of target
                </p>
              )}
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-full group-hover:bg-emerald-500/20 transition-colors self-center">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
            </div>
          </div>

          {/* Monthly Expenses */}
          <div className="p-3 md:p-3.5 rounded-xl bg-white dark:bg-card border border-border-default shadow-sm relative overflow-hidden group transition-all hover:shadow-md flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.12em] leading-none">Expenses</p>
              <p className="text-lg md:text-xl font-bold tracking-tight text-foreground mt-0.5">
                {isMonthlyTransactionsLoading ? (
                  <Skeleton className="h-5 w-16 mt-0.5" />
                ) : (
                  <>
                    {!showLifeHours && <span className="text-[10px] font-normal text-muted-foreground mr-0.5">{currency.symbol}</span>}
                    {formatAmount(monthlyExpenses)}
                  </>
                )}
              </p>
              {totalBudget && totalBudget > 0 && !isMonthlyTransactionsLoading && (
                <p className="text-[9px] text-muted-foreground font-semibold mt-0.5 bg-rose-500/5 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-full w-fit">
                  {expenseProgress.toFixed(0)}% of budget
                </p>
              )}
            </div>
            <div className="p-2 bg-rose-500/10 rounded-full group-hover:bg-rose-500/20 transition-colors self-center">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" strokeWidth={2.5} />
            </div>
          </div>

        </div>

        {/* Circular Fintech Actions */}
        <div className="flex items-center justify-around py-2.5 px-2 bg-white dark:bg-card border border-border-default rounded-xl shadow-sm select-none">
          {[
            { label: "Transactions", icon: Banknote, path: "/transactions" },
            { label: "Budgets", icon: Wallet, path: "/budgets" },
            { label: "Savings", icon: Landmark, path: "/savings" },
            { label: "Subscriptions", icon: Repeat, path: "/subscriptions" },
          ].map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-1.5 group transition-all active:scale-95 duration-200"
              >
                <div className="w-10 h-10 rounded-full bg-muted/60 dark:bg-muted/30 border border-border-default flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white dark:group-hover:text-black transition-all shadow-none">
                  <Icon className="h-4.5 w-4.5 stroke-[1.5] group-hover:scale-110 transition-transform text-foreground" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors tracking-tight">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Recent Transactions Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between mt-1 select-none">
            <h3 className="text-[15px] sm:text-[16px] font-bold text-foreground tracking-tight">
              Transactions
            </h3>
            <Button
              variant="ghost"
              onClick={() => navigate("/transactions")}
              className="text-[10.5px] sm:text-xs font-semibold px-3 py-0.5 h-6 rounded-full bg-muted/60 hover:bg-muted text-foreground transition-all hover:scale-105 active:scale-95 border border-border-default/50"
            >
              see all
            </Button>
          </div>

          <Card className="glass-card border-none overflow-hidden select-none">
            <div className="divide-y divide-border-default/20">
              {displayTransactions.map((tx) => {
                const isIncome = tx.type === "credit";
                const txDate = getFormattedDate(tx.date);

                return (
                  <div
                    key={tx.id}
                    onClick={() => {
                      if (!tx.id.startsWith("mock-")) {
                        navigate("/add-transaction", { state: { transaction: tx } });
                      }
                    }}
                    className="flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted/60 dark:bg-muted/30 flex items-center justify-center text-foreground border border-border-default/30 shrink-0">
                        {isIncome ? (
                          <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2]" />
                        ) : (
                          <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 stroke-[2]" />
                        )}
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[13.5px] font-semibold text-foreground leading-tight tracking-tight">
                          {tx.description}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 font-medium mt-0.5 leading-none">
                          {isIncome ? "Received" : "Sent"} • {txDate}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="text-[14px] font-bold tracking-tight text-foreground font-numeric leading-tight">
                        {isIncome ? "+" : "-"}{!showLifeHours && currency.symbol}{formatAmount(tx.amount)}
                      </span>
                      <span className="text-[9.5px] text-muted-foreground/60 font-semibold capitalize mt-0.5 leading-none">
                        {tx.category.toLowerCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
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
            <div className="h-[300px] relative">
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


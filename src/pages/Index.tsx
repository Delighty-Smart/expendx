import { useState, useEffect, useCallback, useRef } from "react";

import { createPortal } from "react-dom";

import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useBudgetAlerts } from "@/hooks/useBudgetAlerts";
import { Card, GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { ArrowUpRight, ArrowDownRight, PlusCircle, Plus, TrendingUp, Target, PiggyBank, Wallet, TrendingDown, BarChart3, AreaChart, LineChart, ChevronLeft, ChevronRight, Flame, Eye, EyeOff, DollarSign, User, Bell, Receipt, CreditCard } from "lucide-react";

import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/hooks/useAuth";
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
import { Skeleton } from "@/components/ui/skeleton";
import StreakModal from "@/components/StreakModal";
import UserAvatar from "@/components/UserAvatar";
import { getUserProfile } from "@/lib/streak";
import { useEnhancedTransactionData } from "@/hooks/useEnhancedTransactionData";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";

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
  const { user } = useAuth();
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

  const { data: userProfile } = useQuery({
    queryKey: ["user_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      return await getUserProfile();
    },
  });

  // Use the enhanced transaction data hook for monthly transactions
  const {
    transactions: transactionsData,
    isLoading: isMonthlyTransactionsLoading,
    refetch: refetchMonthlyTransactions
  } = useEnhancedTransactionData({
    startDate: firstDayOfMonth,
    endDate: lastDayOfMonth,
    includeArchived: false
  });

  // Use the enhanced transaction data hook for all transactions (wallet balance)
  const {
    transactions: allTransactionsData,
    isLoading: isAllTransactionsLoading
  } = useEnhancedTransactionData({
    includeArchived: false
  });

  const transactions = transactionsData;

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
    },
    user ? { column: 'user_id', value: user.id } : undefined
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

  // Calculate all-time savings from unarchived transactions only
  const calculateTotalSavings = () => {
    return allTransactions
      ?.filter((t) => t.type === "savings")
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  };

  const monthlyIncomeTotal = calculateMonthlyIncome();
  const monthlyExpenses = calculateMonthlyExpenses();
  const monthlySavings = calculateMonthlySavings();


  // Get totals for accurate balance calculation across all pages of data
  // Since we use the same user_id filter, we can rely on the offline manager's full cache
  const totals = enhancedOfflineManager.getTransactionSummary();
  const currentBalance = totals.balance;
  const totalSavings = totals.totalSavings;

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

        <div className="space-y-6 pb-20 px-4 md:px-0">
          {/* Header Area */}
          <div className="flex items-center justify-between pt-4 pb-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {getGreeting()}, {userProfile?.first_name || userProfile?.username || "there"}
              </h1>
              <p className="text-sm text-muted-foreground">{format(today, 'EEEE, MMMM do')}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="rounded-full w-10 h-10 hover:opacity-80 transition-opacity flex items-center justify-center overflow-hidden"
                onClick={() => navigate('/profile')}
              >
                <UserAvatar
                  url={userProfile?.avatar_url}
                  name={userProfile?.username || userProfile?.email || "User"}
                  className="w-full h-full"
                  showDefaultGradient={false}
                />
              </button>
              <div className="relative">
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full w-10 h-10 bg-muted text-foreground hover:bg-muted/80 shadow-none"
                  onClick={() => navigate('/alerts')}
                >
                  <Bell className="h-5 w-5" strokeWidth={1.5} />
                  {unreadAlerts > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Balance</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setHideAmounts(!hideAmounts)}
              >
                {hideAmounts ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-foreground">
              {isMonthlyTransactionsLoading || isMonthlyIncomeLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : monthlyIncome > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-accent" strokeWidth={1.5} />
                  <span>{progressPercentage.toFixed(0)}% of monthly target</span>
                </>
              ) : (
                <span className="text-muted-foreground">No monthly target set</span>
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
            <div className="p-3 rounded-2xl bg-white dark:bg-card border border-border/40 shadow-sm relative overflow-hidden group transition-all hover:shadow-md flex items-center justify-between">
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
              </div>
              <div className="p-2 bg-green-500/10 rounded-full group-hover:bg-green-500/20 transition-colors">
                <ArrowUpRight className="w-4 h-4 text-green-600 dark:text-green-400" strokeWidth={2} />
              </div>
            </div>

            {/* Monthly Expenses */}
            <div className="p-3 rounded-2xl bg-white dark:bg-card border border-border/40 shadow-sm relative overflow-hidden group transition-all hover:shadow-md flex items-center justify-between">
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
              </div>
              <div className="p-2 bg-red-500/10 rounded-full group-hover:bg-red-500/20 transition-colors">
                <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400" strokeWidth={2} />
              </div>
            </div>

          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/transactions')}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-card border border-border/40 shadow-sm transition-all hover:bg-muted/50 active:scale-95 group text-left"
            >
              <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <Receipt className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <span className="font-medium text-foreground text-sm">Transactions</span>
            </button>
            <button
              onClick={() => navigate('/budgets')}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-card border border-border/40 shadow-sm transition-all hover:bg-muted/50 active:scale-95 group text-left"
            >
              <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <DollarSign className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <span className="font-medium text-foreground text-sm">Budgets</span>
            </button>
            <button
              onClick={() => navigate('/savings')}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-card border border-border/40 shadow-sm transition-all hover:bg-muted/50 active:scale-95 group text-left"
            >
              <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <PiggyBank className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <span className="font-medium text-foreground text-sm">Savings</span>
            </button>
            <button
              onClick={() => navigate('/subscriptions')}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-card border border-border/40 shadow-sm transition-all hover:bg-muted/50 active:scale-95 group text-left"
            >
              <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <CreditCard className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <span className="font-medium text-foreground text-sm">Subscriptions</span>
            </button>
          </div>

          {/* Charts section - All using glass card style */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending by Category Chart */}
            <GlassCard className="p-6 chart-container transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border border-border/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">

                <BarChart3 className="h-5 w-5 text-primary" strokeWidth={1.5} />

                Spending by Category
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">

                  <BarChart
                    data={spendingData}
                    margin={{ top: 20, right: 30, left: 5, bottom: 70 }}
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
                      width={100}
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

                <AreaChart className="h-5 w-5 text-primary" strokeWidth={1.5} />

                Daily Income & Expenses
              </h3>
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
                <ResponsiveContainer width="100%" height="100%">
                  <RechartAreaChart data={dailyData} margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
                    <defs>
                      <linearGradient id="income-gradient" x1="0" y1="0" x2="0" y2="1">

                        <stop offset="5%" stopColor="#A3CE22" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#A3CE22" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expense-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00AAFF" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#00AAFF" stopOpacity={0} />
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
                      tickFormatter={(value) => hideAmounts ? '***' : `${currency.symbol}${formatAmount(value)}`}

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

                <LineChart className="h-5 w-5 text-primary" strokeWidth={1.5} />

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

                <BarChart3 className="h-5 w-5 text-primary" strokeWidth={1.5} />

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


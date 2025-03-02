import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  DollarSign,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  AreaChart,
  LineChart,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart as RechartLineChart,
  Line,
  AreaChart as RechartAreaChart,
  Area,
  Legend,
  Sector,
} from "recharts";
import Layout from "@/components/Layout";
import { TransactionForm } from "@/components/TransactionForm";
import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, subWeeks, addWeeks } from "date-fns";
import { TransactionType } from "@/types/transactions";

interface TransactionData {
  id: string;
  amount: number;
  type: string;
  category: string;
  date: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const Dashboard = () => {
  const { currency } = useSettings();
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [hideAmounts, setHideAmounts] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  
  const today = new Date();
  const firstDayOfMonth = startOfMonth(today).toISOString();
  const lastDayOfMonth = endOfMonth(today).toISOString();

  const { data: monthlyIncome } = useQuery({
    queryKey: ["monthly_income"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_income_estimates")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data?.amount || 0;
    },
  });

  const { data: transactionsData, refetch: refetchTransactions } = useQuery({
    queryKey: ["transactions", firstDayOfMonth, lastDayOfMonth],
    queryFn: async () => {
      console.log("Dashboard: Fetching transactions for date range:", firstDayOfMonth, "to", lastDayOfMonth);
      
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("date", firstDayOfMonth)
        .lte("date", lastDayOfMonth);

      if (error) throw error;
      console.log(`Dashboard: Found ${data?.length || 0} transactions in the current month`);
      return data as TransactionData[] || [];
    },
  });

  const transactions = (transactionsData || []).map(transaction => ({
    ...transaction,
    type: transaction.type as TransactionType
  }));

  useEffect(() => {
    console.log("Setting up real-time subscription to transactions table");
    
    const channel = supabase
      .channel('dashboard-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('Transaction changes detected:', payload);
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
          queryClient.invalidateQueries({ queryKey: ["budgets"] });
        }
      )
      .subscribe();

    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleTransactionAdded = () => {
    refetchTransactions();
    queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
  };

  const calculateTotalIncome = () => {
    return transactions
      ?.filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  };

  const calculateTotalExpenses = () => {
    return transactions
      ?.filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  };

  const calculateTotalSavings = () => {
    return transactions
      ?.filter((t) => t.type === "savings")
      .reduce((sum, t) => sum + t.amount, 0) || 0;
  };

  const monthlyIncomeTotal = calculateTotalIncome();
  const monthlyExpenses = calculateTotalExpenses();
  const monthlySavings = calculateTotalSavings();
  
  const currentBalance = monthlyIncomeTotal - monthlyExpenses - monthlySavings;
  
  const progressPercentage = monthlyIncome > 0 
    ? Math.min((monthlyIncomeTotal / monthlyIncome) * 100, 100) 
    : 0;

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
          {currency.symbol}{value.toFixed(2)}
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

  const formatAmount = (amount: number) => {
    if (hideAmounts) {
      return "***";
    }
    return amount.toFixed(2);
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-wrap gap-4 justify-between">
          <Button
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-200"
            onClick={() => setIsTransactionFormOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            Add Transaction
          </Button>
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

        <TransactionForm
          open={isTransactionFormOpen}
          onOpenChange={setIsTransactionFormOpen}
          onTransactionAdded={handleTransactionAdded}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="glass-card p-6 animate-float hover:scale-105 transition-transform duration-200">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
                {currentBalance > 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-bold">
                    +
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-semibold">{currency.symbol}{formatAmount(currentBalance)}</p>
                <div className="mt-1 h-1 w-36 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${currentBalance / (monthlyIncome || 1) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="glass-card p-6 animate-float [animation-delay:200ms] hover:scale-105 transition-transform duration-200">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-secondary" />
                </div>
                <svg className="absolute -top-2 -right-2 w-6 h-6">
                  <circle cx="12" cy="12" r="12" fill="#00AAFF" />
                  <path d="M8 12L10 14L16 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Income</p>
                <p className="text-2xl font-semibold text-secondary">{currency.symbol}{formatAmount(monthlyIncomeTotal)}</p>
                {monthlyIncome > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="h-1 w-24 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-secondary rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {progressPercentage.toFixed(0)}% of est. {currency.symbol}{hideAmounts ? "***" : monthlyIncome.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="glass-card p-6 animate-float [animation-delay:400ms] hover:scale-105 transition-transform duration-200">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="h-8 w-8 text-destructive" />
                </div>
                <svg className="absolute -top-2 -right-2 w-6 h-6">
                  <circle cx="12" cy="12" r="12" fill="#EF4444" />
                  <path d="M16 8L8 16M8 8L16 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Expenses</p>
                <p className="text-2xl font-semibold text-destructive">{currency.symbol}{formatAmount(monthlyExpenses)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="h-1 w-24 bg-gray-200 rounded-full overflow-hidden">
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
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card p-6 chart-container transition-opacity duration-500">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
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
                    tickFormatter={(value) => hideAmounts ? '***' : `${currency.symbol}${value}`}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [hideAmounts ? '***' : `${currency.symbol}${value.toFixed(2)}`, "Amount"]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(229, 231, 235, 0.5)",
                      borderRadius: "0.5rem",
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
          </Card>

          <Card className="glass-card p-6 chart-container transition-opacity duration-500">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
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
                    tickFormatter={(value) => hideAmounts ? '***' : `${currency.symbol}${value}`}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [hideAmounts ? '***' : `${currency.symbol}${value.toFixed(2)}`, ""]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(229, 231, 235, 0.5)",
                      borderRadius: "0.5rem",
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
          </Card>

          <Card className="glass-card p-6 chart-container transition-opacity duration-500">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
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
                    tickFormatter={(value) => hideAmounts ? '***' : `${currency.symbol}${value}`}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [hideAmounts ? '***' : `${currency.symbol}${value.toFixed(2)}`, "Balance"]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(229, 231, 235, 0.5)",
                      borderRadius: "0.5rem",
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
          </Card>

          <Card className="glass-card p-6 chart-container transition-opacity duration-500">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Expense Distribution
            </h3>
            <div className="h-[300px]">
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
                    activeIndex={activeIndex}
                    activeShape={props => renderActiveShape({...props, value: hideAmounts ? 0 : props.value})}
                    data={spendingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="amount"
                    onMouseEnter={onPieEnter}
                    animationBegin={0}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                    fontSize={9}
                  >
                    {spendingData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={`url(#pie-gradient-${index % COLORS.length})`}
                        stroke="#FFFFFF"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [hideAmounts ? '***' : `${currency.symbol}${value.toFixed(2)}`, "Amount"]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(229, 231, 235, 0.5)",
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    }}
                  />
                  <Legend 
                    formatter={(value, entry) => <span style={{ fontSize: '9px' }}>{value}</span>}
                    iconSize={8}
                    wrapperStyle={{ fontSize: '9px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

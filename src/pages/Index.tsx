
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  DollarSign,
  Download,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  AreaChart,
  LineChart,
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
} from "recharts";
import Layout from "@/components/Layout";
import { TransactionForm } from "@/components/TransactionForm";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";

const Dashboard = () => {
  const { currency } = useSettings();
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const chartContainerRef = useRef<HTMLDivElement>(null);

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

  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("date", firstDay.toISOString())
        .lte("date", lastDay.toISOString());

      if (error) throw error;
      return data || [];
    },
  });

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

  const monthlyIncomeTotal = calculateTotalIncome();
  const monthlyExpenses = calculateTotalExpenses();
  const currentBalance = monthlyIncomeTotal - monthlyExpenses;
  const progressPercentage = monthlyIncome > 0 
    ? Math.min((monthlyIncomeTotal / monthlyIncome) * 100, 100) 
    : 0;

  // Prepare data for category spending chart
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
    .slice(0, 5); // Get top 5 categories

  // Prepare data for daily spending chart
  const getDailySpendingData = () => {
    if (!transactions?.length) return [];

    const today = new Date();
    const startDate = startOfMonth(today);
    const endDate = endOfMonth(today);
    
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
        income: dayIncomes,
        expense: dayExpenses
      };
    });
  };

  const dailyData = getDailySpendingData();

  // Prepare data for trend line chart
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
      
      runningBalance += dayIncome - dayExpense;
      
      return {
        date: format(day, 'dd'),
        balance: runningBalance
      };
    });
  };

  const trendData = getTrendData();

  // Colors for charts
  const COLORS = ["#00AAFF", "#A3CE22", "#4B5563", "#9CA3AF", "#F59E0B"];

  // Animation on scroll for charts
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fadeIn');
          }
        });
      },
      { threshold: 0.1 }
    );

    const charts = document.querySelectorAll('.chart-container');
    charts.forEach(chart => {
      observer.observe(chart);
    });

    return () => {
      charts.forEach(chart => {
        observer.unobserve(chart);
      });
    };
  }, [transactions]);

  // Handle pie chart interactive elements
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

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-wrap gap-4">
          <Button
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-200"
            onClick={() => setIsTransactionFormOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            Add Transaction
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        <TransactionForm
          open={isTransactionFormOpen}
          onOpenChange={setIsTransactionFormOpen}
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
                <p className="text-2xl font-semibold">{currency.symbol}{currentBalance.toFixed(2)}</p>
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
                <p className="text-2xl font-semibold text-secondary">{currency.symbol}{monthlyIncomeTotal.toFixed(2)}</p>
                {monthlyIncome > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="h-1 w-24 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-secondary rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {progressPercentage.toFixed(0)}% of est. {currency.symbol}{monthlyIncome.toFixed(2)}
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
                <p className="text-2xl font-semibold text-destructive">{currency.symbol}{monthlyExpenses.toFixed(2)}</p>
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
          <Card className="glass-card p-6 chart-container opacity-0">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Spending by Category
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendingData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    {COLORS.map((color, index) => (
                      <linearGradient key={`bar-gradient-${index}`} id={`bar-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${currency.symbol}${value}`}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${currency.symbol}${value.toFixed(2)}`, "Amount"]}
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
                    radius={[4, 4, 0, 0]}
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

          <Card className="glass-card p-6 chart-container opacity-0">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AreaChart className="h-5 w-5 text-primary" />
              Daily Income & Expenses
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartAreaChart data={dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${currency.symbol}${value}`}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${currency.symbol}${value.toFixed(2)}`, ""]}
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

          <Card className="glass-card p-6 chart-container opacity-0">
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
                    tickFormatter={(value) => `${currency.symbol}${value}`}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${currency.symbol}${value.toFixed(2)}`, "Balance"]}
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
                    dot={{ stroke: '#00AAFF', strokeWidth: 2, r: 4, fill: 'white' }}
                    activeDot={{ r: 6, stroke: "#00AAFF", strokeWidth: 2, fill: "white" }}
                    animationDuration={2000}
                    animationEasing="ease-out"
                  />
                </RechartLineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="glass-card p-6 chart-container opacity-0">
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
                    activeShape={renderActiveShape}
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
                    formatter={(value: number) => [`${currency.symbol}${value.toFixed(2)}`, "Amount"]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(229, 231, 235, 0.5)",
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    }}
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


import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { Transaction, TransactionType, TransactionCategory } from "@/types/transactions";
import { startOfMonth, endOfMonth, format, subMonths, eachMonthOfInterval } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateRangePicker } from "@/components/DateRangePicker";
import TransactionsTable from "@/components/reports/TransactionsTable";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

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

const ReportsPage = () => {
  const { currency } = useSettings();
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date()),
  });
  
  // Subscribe to realtime updates for transactions
  const handleRealtimeUpdates = useCallback(() => {
    console.log('Transaction data changed, refreshing reports...');
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }, [queryClient]);
  
  useRealtimeSubscription('transactions', '*', handleRealtimeUpdates);

  // Query for transactions within the date range
  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ["transactions", dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      console.log(`Fetching transactions from ${dateRange.from} to ${dateRange.to}`);
      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();
      
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("date", fromDate.split('T')[0])  // Just use the date part, not time
        .lte("date", toDate.split('T')[0]);
        
      if (error) {
        console.error("Error fetching transactions:", error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} transactions in the date range`);
      return data as TransactionData[] || [];
    },
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60, // 1 minute
  });

  // Map the raw data to the Transaction type with proper type casting
  const transactions: Transaction[] = (transactionsData || []).map(transaction => ({
    ...transaction,
    type: transaction.type as TransactionType,
    category: transaction.category as TransactionCategory
  }));

  // Calculate summary data
  const totalIncome = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpenses = transactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalSavings = transactions
    .filter((t) => t.type === "savings")
    .reduce((sum, t) => sum + t.amount, 0);

  const months = eachMonthOfInterval({
    start: dateRange.from,
    end: dateRange.to
  });

  // Prepare monthly data for charts
  const monthlyData = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const monthTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= monthStart && date <= monthEnd;
    });
    
    const income = monthTransactions
      .filter(t => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expenses = monthTransactions
      .filter(t => t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0);
      
    const savings = monthTransactions
      .filter(t => t.type === "savings")
      .reduce((sum, t) => sum + t.amount, 0);
      
    return {
      month: format(month, "MMM yyyy"),
      income,
      expenses,
      savings,
      balance: income - expenses - savings
    };
  });

  // Category data for pie charts
  const expensesByCategory = transactions
    .filter(t => t.type === "debit")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    
  const expensePieData = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({
      category,
      amount
    }))
    .sort((a, b) => b.amount - a.amount);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#8dd1e1"];

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Financial Reports</h1>
          <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
        </div>

        <Tabs 
          defaultValue="overview" 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="space-y-4"
        >
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1">Expenses</TabsTrigger>
            <TabsTrigger value="income" className="flex-1">Income</TabsTrigger>
            <TabsTrigger value="transactions" className="flex-1">Transactions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-6">
                <h3 className="text-lg font-medium mb-2">Income</h3>
                <p className="text-2xl font-semibold text-green-600">{currency.symbol}{formatAmount(totalIncome)}</p>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-medium mb-2">Expenses</h3>
                <p className="text-2xl font-semibold text-red-600">{currency.symbol}{formatAmount(totalExpenses)}</p>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-medium mb-2">Savings</h3>
                <p className="text-2xl font-semibold text-blue-600">{currency.symbol}{formatAmount(totalSavings)}</p>
              </Card>
            </div>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Monthly Overview</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    barGap={0}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [currency.symbol + formatAmount(value), ""]} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#A3CE22" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#FF6B6B" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="savings" name="Savings" fill="#00AAFF" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="expenses">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Expense Categories</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [currency.symbol + formatAmount(value), ""]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Monthly Expenses</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [currency.symbol + formatAmount(value), ""]} />
                      <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#FF6B6B" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="income">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Monthly Income</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [currency.symbol + formatAmount(value), ""]} />
                    <Line type="monotone" dataKey="income" name="Income" stroke="#A3CE22" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="transactions">
            <Card className="p-6">
              <ScrollArea className="h-[calc(100vh-300px)]">
                <TransactionsTable transactions={transactions} currency={currency} />
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ReportsPage;

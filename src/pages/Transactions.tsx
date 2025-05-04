
import { useState, useCallback, useEffect } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import TransactionsTable from "@/components/reports/TransactionsTable";
import { TransactionForm } from "@/components/TransactionForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Transaction, TransactionType, TransactionCategory } from "@/types/transactions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, isThisMonth, parseISO } from "date-fns";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useSettings } from "@/contexts/SettingsContext";
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

const TransactionsPage = () => {
  const { currency } = useSettings();
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | TransactionType>("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const queryClient = useQueryClient();

  // Convert date range to ISO strings for the query
  const fromDate = dateRange.from.toISOString();
  const toDate = dateRange.to.toISOString();

  // Subscribe to realtime updates for transactions
  const handleRealtimeUpdates = useCallback(() => {
    console.log('Transaction data changed, refreshing...');
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }, [queryClient]);

  useRealtimeSubscription('transactions', '*', handleRealtimeUpdates);

  // Query to fetch all transactions within the date range
  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ["transactions", fromDate, toDate],
    queryFn: async () => {
      console.log(`Fetching transactions from ${fromDate} to ${toDate}`);
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("date", fromDate.split('T')[0])  // Just use the date part, not time
        .lte("date", toDate.split('T')[0]);
        
      if (error) {
        console.error("Error fetching transactions:", error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} transactions`);
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

  // Filter transactions based on the active tab
  const filteredTransactions = transactions.filter(
    (t) => activeTab === "all" || t.type === activeTab
  );

  const handleTransactionAdded = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <div className="flex flex-wrap gap-2">
            <DateRangePicker
              dateRange={dateRange}
              setDateRange={setDateRange}
            />
            <Button
              className="flex items-center gap-2"
              onClick={() => setIsTransactionFormOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </div>

        <TransactionForm
          open={isTransactionFormOpen}
          onOpenChange={setIsTransactionFormOpen}
          onTransactionAdded={handleTransactionAdded}
        />

        <Card className="overflow-hidden">
          <Tabs
            defaultValue="all"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "all" | TransactionType)}
            className="w-full"
          >
            <div className="p-4 border-b">
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                <TabsTrigger value="credit" className="flex-1">Income</TabsTrigger>
                <TabsTrigger value="debit" className="flex-1">Expenses</TabsTrigger>
                <TabsTrigger value="savings" className="flex-1">Savings</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="p-4">
              <TransactionsTable 
                transactions={filteredTransactions} 
                currency={currency} 
              />
            </TabsContent>

            <TabsContent value="credit" className="p-4">
              <TransactionsTable 
                transactions={filteredTransactions} 
                currency={currency} 
              />
            </TabsContent>

            <TabsContent value="debit" className="p-4">
              <TransactionsTable 
                transactions={filteredTransactions} 
                currency={currency} 
              />
            </TabsContent>

            <TabsContent value="savings" className="p-4">
              <TransactionsTable 
                transactions={filteredTransactions} 
                currency={currency} 
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </Layout>
  );
};

export default TransactionsPage;

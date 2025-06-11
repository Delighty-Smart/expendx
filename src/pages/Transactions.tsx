import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Filter, ArrowUpDown, Archive, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/contexts/SettingsContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useRefresh } from "@/hooks/useRefresh";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: "credit" | "debit" | "savings";
  date: string;
  archived: boolean;
  created_at: string;
}

const TransactionsPage = () => {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();
  const { currency } = useSettings();
  const { toast } = useToast();
  const { refreshData } = useRefresh();

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ["transactions", showArchived],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", showArchived)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
  });

  const filteredTransactions = transactions?.filter(transaction => {
    if (categoryFilter && transaction.category !== categoryFilter) {
      return false;
    }
    if (typeFilter && transaction.type !== typeFilter) {
      return false;
    }
    return true;
  });

  const handleArchiveTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ archived: true })
        .eq("id", id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Transaction archived successfully",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUnarchiveTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ archived: false })
        .eq("id", id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Transaction unarchived successfully",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  if (isLoading) {
    return <Layout><div>Loading transactions...</div></Layout>;
  }

  return (
    <Layout>
      <PullToRefresh onRefresh={refreshData} containerClassName="h-full">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Transactions</h1>
            <Button onClick={() => navigate('/add-transaction')} className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Transaction
            </Button>
          </div>

          <Card className="p-4 glass-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Categories</SelectItem>
                    {[...new Set(transactions?.map(t => t.category))].map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Types</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {showArchived ? "Show Active" : "Show Archived"}
              </Button>
            </div>
          </Card>

          <ScrollArea className="h-[calc(100vh-320px)] transition-all duration-500 ease-in-out overflow-auto pr-2">
            {filteredTransactions?.length === 0 ? (
              <div className="text-center py-4">No transactions found.</div>
            ) : (
              <div className="space-y-3 pb-6">
                {filteredTransactions?.map((transaction) => (
                  <Card key={transaction.id} className="p-4 glass-card hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{transaction.description}</h3>
                        <p className="text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</p>
                        <Badge variant="secondary" className="mt-1">{transaction.category}</Badge>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-semibold ${transaction.type === 'credit' ? 'text-green-500' : transaction.type === 'savings' ? 'text-blue-500' : 'text-red-500'}`}>
                          {currency.symbol}{formatAmount(transaction.amount)}
                        </p>
                        <div className="flex gap-2 mt-2">
                          {showArchived ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleUnarchiveTransaction(transaction.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleArchiveTransaction(transaction.id)}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="h-4 w-4"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.5 5.25a.75.75 0 00-1.5 0v2.632a.75.75 0 001.5 0V5.25zm-9 0a.75.75 0 00-1.5 0v2.632a.75.75 0 001.5 0V5.25zm4.5 0a.75.75 0 00-1.5 0v8.602a.75.75 0 001.5 0V5.25zm4.5 0a.75.75 0 00-1.5 0v8.602a.75.75 0 001.5 0V5.25zM6 9a1.5 1.5 0 011.5-1.5h9a1.5 1.5 0 011.5 1.5v5.25a.75.75 0 01-1.5 0V9h-9v5.25a.75.75 0 01-1.5 0V9z"
                                    clipRule="evenodd"
                                  />
                                  <path d="M6.75 3h10.5a.75.75 0 010 0H6.75a.75.75 0 010 0z" />
                                </svg>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this transaction? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTransaction(transaction.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </PullToRefresh>
    </Layout>
  );
};

export default TransactionsPage;

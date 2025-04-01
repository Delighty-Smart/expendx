import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TransactionForm } from "@/components/TransactionForm";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle, MoreVertical, Edit, Trash2, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Transaction, TransactionType, TransactionCategory, expenseCategories, incomeCategories, savingsCategories } from "@/types/transactions";
import { useSettings } from "@/contexts/SettingsContext";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

// Combine all categories for filtering
const allCategories = ["All", ...incomeCategories, ...expenseCategories, ...savingsCategories] as const;
type AllCategories = (typeof allCategories)[number];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AllCategories>("All");
  const [selectedType, setSelectedType] = useState<"all" | "credit" | "debit" | "savings">("all");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: transactionsData, refetch: refetchTransactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      console.log("TransactionsPage: Fetching all transactions");
      
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });
      
      if (error) throw error;
      console.log(`TransactionsPage: Retrieved ${data?.length || 0} transactions`);
      return data as TransactionData[] || [];
    },
  });

  // Convert data to the correct Transaction type with proper category type casting
  const transactions: Transaction[] = (transactionsData || []).map(transaction => ({
    ...transaction,
    type: transaction.type as TransactionType,
    category: transaction.category as TransactionCategory
  }));

  // Use our custom realtime subscription hook
  const handleRealTimeUpdates = useCallback((payload: any) => {
    console.log('Transaction change detected:', payload);
    
    // When changes are detected, refetch data
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
    
    // Clear any selected transactions when data changes
    setSelectedTransactions([]);
    
    // Show a toast to notify user of data changes
    const eventType = payload.eventType;
    if (eventType === 'INSERT') {
      toast({
        title: "New Transaction",
        description: "A new transaction has been added"
      });
    } else if (eventType === 'UPDATE') {
      toast({
        title: "Transaction Updated",
        description: "A transaction has been updated"
      });
    } else if (eventType === 'DELETE') {
      toast({
        title: "Transaction Deleted",
        description: "A transaction has been removed"
      });
    }
  }, [queryClient, toast]);

  useRealtimeSubscription('transactions', '*', handleRealTimeUpdates);

  const handleDelete = async (ids: string[]) => {
    try {
      const { error } = await supabase.from("transactions").delete().in("id", ids);
      if (error) throw error;

      // Clear selected transactions
      setSelectedTransactions([]);
      
      toast({
        title: "Success",
        description: `${ids.length} transaction(s) deleted successfully`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredTransactions = transactions?.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || transaction.category === selectedCategory;
    const matchesType = selectedType === "all" || transaction.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  // Group transactions by month, then by day
  const groupedTransactions = filteredTransactions?.reduce((groups, transaction) => {
    const month = format(new Date(transaction.date), "MMMM yyyy");
    if (!groups[month]) {
      groups[month] = {};
    }
    
    const day = format(new Date(transaction.date), "yyyy-MM-dd");
    if (!groups[month][day]) {
      groups[month][day] = [];
    }
    
    groups[month][day].push(transaction);
    return groups;
  }, {} as Record<string, Record<string, Transaction[]>>) || {};

  // Sort daily transactions by creation time (latest first)
  Object.keys(groupedTransactions).forEach(month => {
    Object.keys(groupedTransactions[month]).forEach(day => {
      groupedTransactions[month][day].sort((a, b) => {
        // First sort by date if available
        if (a.date !== b.date) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        // Then sort by created_at timestamp for same-day transactions
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
    });
  });

  const handleSelectAll = (transactions: Transaction[]) => {
    const transactionIds = transactions.map(t => t.id);
    if (transactionIds.every(id => selectedTransactions.includes(id))) {
      setSelectedTransactions(prev => prev.filter(id => !transactionIds.includes(id)));
    } else {
      setSelectedTransactions(prev => [...prev, ...transactionIds.filter(id => !prev.includes(id))]);
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Get sorted days for a month (latest first)
  const getSortedDays = (month: string) => {
    return Object.keys(groupedTransactions[month]).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-neutral">Transactions</h1>
          <div className="flex gap-2">
            {selectedTransactions.length > 0 && (
              <Button variant="destructive" className="flex items-center gap-2" onClick={() => handleDelete(selectedTransactions)}>
                <Trash className="h-4 w-4" />
                Delete Selected ({selectedTransactions.length})
              </Button>
            )}
            <Button className="flex items-center gap-2" onClick={() => {
              setEditingTransaction(null);
              setIsTransactionFormOpen(true);
            }}>
              <PlusCircle className="h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input placeholder="Search transactions..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>

              <div className="flex gap-4">
                <Select
                  value={selectedCategory}
                  onValueChange={(value: AllCategories) => setSelectedCategory(value)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedType}
                  onValueChange={(value: "all" | "credit" | "debit" | "savings") => setSelectedType(value)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit">Credit (Income)</SelectItem>
                    <SelectItem value="debit">Debit (Expense)</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {Object.entries(groupedTransactions).map(([month, daysInMonth]) => (
              <div key={month} className="rounded-md border">
                <div className="bg-muted px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={Object.values(daysInMonth).flat().every(t => selectedTransactions.includes(t.id))} 
                      onCheckedChange={() => handleSelectAll(Object.values(daysInMonth).flat())} 
                    />
                    <h3 className="font-semibold">{month}</h3>
                  </div>
                </div>
                
                {getSortedDays(month).map(day => {
                  const dayTransactions = daysInMonth[day];
                  const formattedDay = format(parseISO(day), "EEEE, MMMM d");
                  
                  return (
                    <div key={day}>
                      <div className="px-4 py-2 bg-muted/30 border-t border-b">
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            checked={dayTransactions.every(t => selectedTransactions.includes(t.id))} 
                            onCheckedChange={() => handleSelectAll(dayTransactions)} 
                          />
                          <h4 className="text-sm font-medium text-muted-foreground">{formattedDay}</h4>
                        </div>
                      </div>
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[30px]"></TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dayTransactions.map(transaction => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                <Checkbox 
                                  checked={selectedTransactions.includes(transaction.id)} 
                                  onCheckedChange={(checked) => {
                                    setSelectedTransactions(prev => 
                                      checked 
                                        ? [...prev, transaction.id] 
                                        : prev.filter(id => id !== transaction.id)
                                    );
                                  }} 
                                />
                              </TableCell>
                              <TableCell>{transaction.description}</TableCell>
                              <TableCell>{transaction.category}</TableCell>
                              <TableCell>
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.type === "credit" 
                                    ? "bg-green-100 text-green-800" 
                                    : transaction.type === "debit"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}>
                                  {transaction.type}
                                </span>
                              </TableCell>
                              <TableCell className={`text-right ${
                                transaction.type === "credit" 
                                  ? "text-green-600" 
                                  : transaction.type === "debit"
                                  ? "text-red-600"
                                  : "text-blue-600"
                              }`}>
                                {currency.symbol}{formatAmount(transaction.amount)}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setEditingTransaction(transaction);
                                      setIsTransactionFormOpen(true);
                                    }}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete([transaction.id])}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>

        <TransactionForm 
          open={isTransactionFormOpen} 
          onOpenChange={setIsTransactionFormOpen} 
          onTransactionAdded={refetchTransactions} 
          transaction={editingTransaction} 
        />
      </div>
    </Layout>
  );
};

export default TransactionsPage;

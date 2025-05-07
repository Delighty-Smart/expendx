
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle, Trash, ArrowUp, ArrowDown, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { TransactionType } from "@/types/transactions";
import { useSettings } from "@/contexts/SettingsContext";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useTransactionData } from "@/hooks/useTransactionData";

const TransactionsPage = () => {
  const { currency } = useSettings();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<"all" | TransactionType>("all");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const { toast } = useToast();

  // Use our custom transaction hook for data fetching with pull-to-refresh support
  const { 
    transactions, 
    isLoading, 
    refetch: refetchTransactions 
  } = useTransactionData();

  const handleRefresh = async () => {
    try {
      await refetchTransactions();
      toast({
        title: "Refreshed",
        description: "Transaction data updated successfully",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Could not update transaction data",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (ids: string[]) => {
    try {
      const { error } = await supabase.from("transactions").delete().in("id", ids);
      if (error) throw error;

      // Clear selected transactions
      setSelectedTransactions([]);
      
      await refetchTransactions();
      
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

  const handleEdit = (transaction: any) => {
    navigate("/add-transaction", { state: { transaction } });
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
  }, {} as Record<string, Record<string, any[]>>) || {};

  // Calculate monthly totals
  const getMonthlyTotals = (month: string) => {
    let income = 0;
    let expense = 0;
    
    Object.values(groupedTransactions[month] || {}).forEach(dayTransactions => {
      dayTransactions.forEach(transaction => {
        if (transaction.type === 'credit') {
          income += transaction.amount;
        } else if (transaction.type === 'debit') {
          expense += transaction.amount;
        }
      });
    });
    
    return { income, expense };
  };

  const handleSelectTransaction = (id: string, checked: boolean) => {
    setSelectedTransactions(prev => 
      checked ? [...prev, id] : prev.filter(transId => transId !== id)
    );
  };

  const handleSelectAll = (transactions: any[]) => {
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

  const renderTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'credit':
        return <ArrowDown className="h-4 w-4 text-green-500" />;
      case 'debit':
        return <ArrowUp className="h-4 w-4 text-red-500" />;
      case 'savings':
        return <div className="h-4 w-4 rounded-full bg-blue-400"></div>;
      default:
        return null;
    }
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
                Delete ({selectedTransactions.length})
              </Button>
            )}
            <Button 
              className="flex items-center gap-2" 
              onClick={() => navigate("/add-transaction")}
            >
              <PlusCircle className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search transactions..." 
                  className="pl-9" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>

              <div className="flex gap-2">
                <Select
                  value={selectedType}
                  onValueChange={(value: "all" | TransactionType) => setSelectedType(value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit">Income</SelectItem>
                    <SelectItem value="debit">Expense</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <PullToRefresh 
            onRefresh={handleRefresh}
            containerClassName="transactions-container"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCcw className="h-8 w-8 text-primary animate-spin" />
                <p className="mt-4 text-muted-foreground">Loading transactions...</p>
              </div>
            ) : Object.keys(groupedTransactions).length > 0 ? (
              <div className="divide-y">
                {Object.entries(groupedTransactions).map(([month, days]) => {
                  const { income, expense } = getMonthlyTotals(month);
                  
                  return (
                    <div key={month} className="transaction-month-group">
                      {/* Month header */}
                      <div className="bg-gray-50 p-4 border-b">
                        <div className="flex flex-col">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                size="sm"
                                checked={Object.values(days).flat().every(t => selectedTransactions.includes(t.id))} 
                                onCheckedChange={() => handleSelectAll(Object.values(days).flat())} 
                              />
                              <span className="font-medium">{month}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground ml-6 mt-1">
                            <div>
                              In: {currency.symbol}{formatAmount(income)}
                            </div>
                            <div>
                              Out: {currency.symbol}{formatAmount(expense)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Days and transactions */}
                      <div className="divide-y">
                        {Object.entries(days)
                          .sort(([dayA], [dayB]) => new Date(dayB).getTime() - new Date(dayA).getTime())
                          .map(([day, dayTransactions]) => (
                            <div key={day} className="transaction-day-group">
                              <div className="px-4 py-2 bg-gray-50/50 border-b text-sm text-muted-foreground flex items-center gap-2">
                                <Checkbox 
                                  size="sm"
                                  checked={dayTransactions.every(t => selectedTransactions.includes(t.id))} 
                                  onCheckedChange={() => handleSelectAll(dayTransactions)} 
                                />
                                {format(new Date(day), "EEEE, MMM d")}
                              </div>
                              
                              <div className="divide-y">
                                {dayTransactions.map((transaction) => (
                                  <div 
                                    key={transaction.id} 
                                    className="transaction-row p-4 flex items-center gap-3"
                                    onClick={() => handleEdit(transaction)}
                                  >
                                    <Checkbox 
                                      size="sm"
                                      checked={selectedTransactions.includes(transaction.id)}
                                      onCheckedChange={(checked) => {
                                        // Stop propagation to prevent navigation
                                        handleSelectTransaction(transaction.id, checked === true);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    
                                    <div className="flex-shrink-0">
                                      {renderTransactionIcon(transaction.type as TransactionType)}
                                    </div>
                                    
                                    <div className="flex-1">
                                      <p className="font-medium text-sm line-clamp-1">
                                        {transaction.description}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {transaction.category}
                                      </p>
                                    </div>
                                    
                                    <div className={`text-right ${
                                      transaction.type === "credit" 
                                        ? "text-green-600" 
                                        : transaction.type === "debit"
                                        ? "text-red-600"
                                        : "text-blue-600"
                                    }`}>
                                      <p className="font-medium text-sm">
                                        {transaction.type === "credit" ? "+" : transaction.type === "debit" ? "-" : ""}
                                        {currency.symbol}{formatAmount(transaction.amount)}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(transaction.date), "HH:mm")}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">No transactions found for the selected filters</p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/add-transaction")}
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add your first transaction
                </Button>
              </div>
            )}
          </PullToRefresh>
        </Card>
      </div>
    </Layout>
  );
};

export default TransactionsPage;

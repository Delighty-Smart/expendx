import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle, Trash, ArrowUp, ArrowDown, RefreshCcw, Archive, Plus, Trash2, Edit, Calendar, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from "date-fns";
import { TransactionType } from "@/types/transactions";
import { useSettings } from "@/contexts/SettingsContext";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useTransactionData } from "@/hooks/useTransactionData";
import { useRefresh } from "@/hooks/useRefresh";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

const TransactionsPage = () => {
  const { currency } = useSettings();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<"all" | TransactionType>("all");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const { toast } = useToast();
  const { refreshData } = useRefresh();

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
        description: "Transaction data updated successfully"
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Could not update transaction data",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("transactions").delete().in("id", selectedTransactions);
      if (error) throw error;

      // Clear selected transactions and exit selection mode
      setSelectedTransactions([]);
      setSelectionMode(false);
      await refetchTransactions();
      
      toast({
        title: "Success",
        description: `${selectedTransactions.length} transaction(s) deleted successfully`
      });
      
      setConfirmDeleteOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setConfirmDeleteOpen(false);
    }
  };

  const handleArchive = async () => {
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ archived: true })
        .in("id", selectedTransactions);
      
      if (error) throw error;

      // Clear selected transactions and exit selection mode
      setSelectedTransactions([]);
      setSelectionMode(false);
      await refetchTransactions();
      
      toast({
        title: "Success",
        description: `${selectedTransactions.length} transaction(s) archived successfully`
      });
      
      setConfirmArchiveOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setConfirmArchiveOpen(false);
    }
  };

  const handleEdit = (transaction: any) => {
    if (!selectionMode) {
      navigate("/add-transaction", {
        state: { transaction }
      });
    }
  };
  
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedTransactions([]);
  };

  const toggleTransactionSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (selectionMode) {
      setSelectedTransactions(prev => 
        prev.includes(id) ? prev.filter(transId => transId !== id) : [...prev, id]
      );
    }
  };

  const selectAllInDay = (dayTransactions: any[], e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectionMode) return;
    
    const dayIds = dayTransactions.map(t => t.id);
    const allSelected = dayIds.every(id => selectedTransactions.includes(id));
    
    if (allSelected) {
      // Deselect all
      setSelectedTransactions(prev => prev.filter(id => !dayIds.includes(id)));
    } else {
      // Select all
      const newSelected = [...selectedTransactions];
      dayIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      setSelectedTransactions(newSelected);
    }
  };
  
  const selectAllInMonth = (monthTransactions: any[], e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectionMode) return;
    
    const monthIds = monthTransactions.flat().map(t => t.id);
    const allSelected = monthIds.every(id => selectedTransactions.includes(id));
    
    if (allSelected) {
      // Deselect all
      setSelectedTransactions(prev => prev.filter(id => !monthIds.includes(id)));
    } else {
      // Select all
      const newSelected = [...selectedTransactions];
      monthIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      setSelectedTransactions(newSelected);
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
        return <div className="h-3.5 w-3.5 rounded-full bg-blue-400"></div>;
      default:
        return null;
    }
  };

  // Ensure currency has a valid default value to avoid null/undefined errors
  const currencySymbol = currency?.symbol || "$";

  return (
    <Layout>
      <PullToRefresh onRefresh={refreshData} containerClassName="h-full">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
            <div className="flex gap-2">
              {selectionMode && selectedTransactions.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950"
                    onClick={() => setConfirmArchiveOpen(true)}
                  >
                    <Archive className="h-4 w-4" />
                    Archive ({selectedTransactions.length})
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex items-center gap-2"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete ({selectedTransactions.length})
                  </Button>
                </>
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

          <Card className="overflow-hidden p-0 bg-card border-border">
            <div className="p-4 border-b border-border bg-card">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    className="pl-9 bg-background border-input text-foreground placeholder:text-muted-foreground"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Select
                    value={selectedType}
                    onValueChange={(value: "all" | TransactionType) =>
                      setSelectedType(value)
                    }
                  >
                    <SelectTrigger className="w-[150px] bg-background border-input text-foreground">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="all" className="text-foreground">All Types</SelectItem>
                      <SelectItem value="credit" className="text-foreground">Income</SelectItem>
                      <SelectItem value="debit" className="text-foreground">Expense</SelectItem>
                      <SelectItem value="savings" className="text-foreground">Savings</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant={selectionMode ? "secondary" : "outline"}
                    onClick={toggleSelectionMode}
                    size="sm"
                    className={selectionMode ? "bg-secondary text-secondary-foreground" : "bg-background border-input text-foreground hover:bg-accent"}
                  >
                    {selectionMode ? "Cancel" : "Select"}
                  </Button>
                </div>
              </div>
            </div>

            <PullToRefresh onRefresh={handleRefresh} containerClassName="transactions-container">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 bg-card">
                  <RefreshCcw className="h-8 w-8 text-primary animate-spin" />
                  <p className="mt-4 text-muted-foreground">Loading transactions...</p>
                </div>
              ) : Object.keys(groupedTransactions).length > 0 ? (
                <div className="divide-y divide-border">
                  {Object.entries(groupedTransactions).map(([month, days]) => {
                    const { income, expense } = getMonthlyTotals(month);
                    const allDayTransactions = Object.values(days).flat();
                    
                    return (
                      <div key={month} className="transaction-month-group">
                        {/* Month header */}
                        <div 
                          className={`bg-muted/50 dark:bg-muted/20 p-4 border-b border-border ${selectionMode ? 'cursor-pointer hover:bg-muted/70 dark:hover:bg-muted/30' : ''}`}
                          onClick={(e) => selectionMode ? selectAllInMonth(allDayTransactions, e) : undefined}
                        >
                          <div className="flex flex-col">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-foreground">{month}</span>
                              {selectionMode && (
                                <div className={`h-4 w-4 rounded-sm border-2 border-primary ${
                                  allDayTransactions.every(t => selectedTransactions.includes(t.id))
                                    ? 'bg-primary'
                                    : allDayTransactions.some(t => selectedTransactions.includes(t.id))
                                    ? 'bg-primary/30'
                                    : 'bg-background'
                                }`}></div>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                              <div>
                                In: {currencySymbol}{formatAmount(income)}
                              </div>
                              <div>
                                Out: {currencySymbol}{formatAmount(expense)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Days and transactions */}
                        <div className="divide-y divide-border">
                          {Object.entries(days)
                            .sort(
                              ([dayA], [dayB]) =>
                                new Date(dayB).getTime() - new Date(dayA).getTime()
                            )
                            .map(([day, dayTransactions]) => (
                              <div key={day} className="transaction-day-group">
                                <div 
                                  className={`px-4 py-2 bg-muted/30 dark:bg-muted/10 border-b border-border text-sm text-muted-foreground flex items-center justify-between ${selectionMode ? 'cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/20' : ''}`}
                                  onClick={(e) => selectionMode ? selectAllInDay(dayTransactions, e) : undefined}
                                >
                                  <span className="text-foreground">{format(new Date(day), "EEEE, MMM d")}</span>
                                  
                                  {selectionMode && (
                                    <div className={`h-4 w-4 rounded-sm border-2 border-primary ${
                                      dayTransactions.every(t => selectedTransactions.includes(t.id))
                                        ? 'bg-primary'
                                        : dayTransactions.some(t => selectedTransactions.includes(t.id))
                                        ? 'bg-primary/30'
                                        : 'bg-background'
                                    }`}></div>
                                  )}
                                </div>

                                <div className="divide-y divide-border">
                                  {dayTransactions.map((transaction) => (
                                    <div
                                      key={transaction.id}
                                      className={`transaction-row p-4 flex items-center gap-3 bg-card hover:bg-accent/50 dark:hover:bg-accent/20 ${selectionMode ? 'cursor-pointer' : ''}`}
                                      onClick={() => selectionMode 
                                        ? toggleTransactionSelection(transaction.id) 
                                        : handleEdit(transaction)
                                      }
                                    >
                                      {selectionMode && (
                                        <div 
                                          className={`h-4 w-4 shrink-0 rounded-sm border-2 border-primary ${
                                            selectedTransactions.includes(transaction.id) ? 'bg-primary' : 'bg-background'
                                          }`}
                                        />
                                      )}

                                      <div className="flex-shrink-0">
                                        {renderTransactionIcon(transaction.type as TransactionType)}
                                      </div>

                                      <div className="flex-1 flex flex-col">
                                        <p className="font-medium text-sm leading-tight text-foreground">
                                          {transaction.description}
                                        </p>
                                        <p className="text-xs text-muted-foreground leading-none mt-1">
                                          {transaction.category}
                                        </p>
                                      </div>

                                      <div
                                        className={`text-right ${
                                          transaction.type === "credit"
                                            ? "text-green-600 dark:text-green-400"
                                            : transaction.type === "debit"
                                            ? "text-red-600 dark:text-red-400"
                                            : "text-blue-600 dark:text-blue-400"
                                        }`}
                                      >
                                        <p className="font-medium text-sm leading-tight">
                                          {transaction.type === "credit"
                                            ? "+"
                                            : transaction.type === "debit"
                                            ? "-"
                                            : ""}
                                          {currencySymbol}
                                          {formatAmount(transaction.amount)}
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
                <div className="text-center py-12 text-muted-foreground bg-card">
                  <p className="mb-4">No transactions found for the selected filters</p>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/add-transaction")}
                    className="flex items-center gap-2 bg-background border-input text-foreground hover:bg-accent"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add your first transaction
                  </Button>
                </div>
              )}
            </PullToRefresh>
          </Card>
        </div>

        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Are you sure you want to delete {selectedTransactions.length} transaction(s)? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-background border-input text-foreground hover:bg-accent">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmArchiveOpen} onOpenChange={setConfirmArchiveOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Confirm Archive</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Are you sure you want to archive {selectedTransactions.length} transaction(s)? 
                Archived transactions can be restored from the Settings page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-background border-input text-foreground hover:bg-accent">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchive} className="bg-orange-600 hover:bg-orange-700 text-white">
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PullToRefresh>
    </Layout>
  );
};

export default TransactionsPage;


import { useState, useMemo, useCallback, useRef, useEffect } from "react";

import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, PlusCircle, Trash, ArrowUp, ArrowDown, RefreshCcw, Archive, Plus, Trash2, Edit, Calendar, SlidersHorizontal, X, TrendingUp, TrendingDown, PiggyBank, Shapes } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from "date-fns";
import { TransactionType } from "@/types/transactions";
import { useSettings } from "@/contexts/SettingsContext";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useEnhancedTransactionData } from "@/hooks/useEnhancedTransactionData";
import { useRefresh } from "@/hooks/useRefresh";
import { useCategories } from "@/hooks/useCategories";
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
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useEnhancedOfflineSync } from "@/hooks/useEnhancedOfflineSync";
import { PendingSyncIndicator } from "@/components/PendingSyncIndicator";

const TransactionsPage = () => {
  const { currency } = useSettings();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<"all" | TransactionType>("all");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const { toast } = useToast();
  const { refreshData } = useRefresh();
  const { getTransactionSyncStatus } = useEnhancedOfflineSync();

  // Use enhanced transaction hook for offline support
  const {
    transactions,
    isLoading,
    refetch: refetchTransactions,

    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,

    deleteTransactionOffline,
    updateTransactionOffline
  } = useEnhancedTransactionData({
    type: selectedType
  });


  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget, hasNextPage, fetchNextPage]);


  // Get categories from all transaction types
  const { categories: expenseCategories } = useCategories('debit');
  const { categories: incomeCategories } = useCategories('credit');
  const { categories: savingsCategories } = useCategories('savings');



  // Get categories based on selected transaction type
  const availableCategories = useMemo(() => {
    if (selectedType === "all") {
      const categoriesWithType = [
        ...expenseCategories.map(cat => ({ name: cat, type: 'debit' as TransactionType })),
        ...incomeCategories.map(cat => ({ name: cat, type: 'credit' as TransactionType })),
        ...savingsCategories.map(cat => ({ name: cat, type: 'savings' as TransactionType }))
      ];


      // Remove duplicates and sort
      return categoriesWithType.filter((cat, index, arr) =>

        arr.findIndex(c => c.name === cat.name) === index
      ).sort((a, b) => a.name.localeCompare(b.name));
    } else if (selectedType === "credit") {
      return incomeCategories.map(cat => ({ name: cat, type: 'credit' as TransactionType }));
    } else if (selectedType === "debit") {
      return expenseCategories.map(cat => ({ name: cat, type: 'debit' as TransactionType }));
    } else if (selectedType === "savings") {
      return savingsCategories.map(cat => ({ name: cat, type: 'savings' as TransactionType }));
    }
    return [];
  }, [selectedType, expenseCategories, incomeCategories, savingsCategories]);

  // Reset selected categories when type changes
  const handleTypeChange = (value: "all" | TransactionType) => {
    setSelectedType(value);
    setSelectedCategories([]);
  };

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
      // Use enhanced offline delete for each selected transaction
      for (const transactionId of selectedTransactions) {
        await deleteTransactionOffline(transactionId);
      }

      // Clear selected transactions and exit selection mode
      setSelectedTransactions([]);
      setSelectionMode(false);



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
      // Archive is essentially an update operation using the hook's update function
      for (const transactionId of selectedTransactions) {
        await updateTransactionOffline(transactionId, { archived: true });
      }

      // Clear selected transactions and exit selection mode
      setSelectedTransactions([]);
      setSelectionMode(false);



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
      setSelectedTransactions(prev => prev.filter(id => !dayIds.includes(id)));
    } else {
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
      setSelectedTransactions(prev => prev.filter(id => !monthIds.includes(id)));
    } else {
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

    const matchesSearch =

      transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(transaction.category);
    const matchesType = selectedType === "all" || transaction.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const toggleCategory = (category: string) => {

    setSelectedCategories(prev =>
      prev.includes(category)

        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };



  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

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
    const monthData = groupedTransactions[month];
    if (monthData && typeof monthData === 'object') {
      Object.values(monthData).forEach((dayTransactions: any) => {
        if (Array.isArray(dayTransactions)) {
          dayTransactions.forEach(transaction => {
            if (transaction.type === 'credit') {
              income += transaction.amount;
            } else if (transaction.type === 'debit') {
              expense += transaction.amount;
            }
          });
        }
      });
    }
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

        return <ArrowDown className="h-4 w-4 text-green-500" strokeWidth={1.5} />;
      case 'debit':
        return <ArrowUp className="h-4 w-4 text-red-500" strokeWidth={1.5} />;

      case 'savings':
        return <div className="h-3.5 w-3.5 rounded-full bg-blue-400"></div>;
      default:
        return null;
    }
  };

  const currencySymbol = currency?.symbol || "$";

  return (
    <Layout>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-6 pb-24">

          <div className="sticky top-14 lg:top-0 z-20 bg-background pb-4 mb-4 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
              <OfflineIndicator />
            </div>
            <div className="flex gap-2">
              {selectionMode && selectedTransactions.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950"
                    onClick={() => setConfirmArchiveOpen(true)}
                  >

                    <Archive className="h-4 w-4" strokeWidth={1.5} />

                    Archive ({selectedTransactions.length})
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex items-center gap-2"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >

                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />

                    Delete ({selectedTransactions.length})
                  </Button>
                </>
              )}
              <Button
                size="compact"
                className="flex items-center gap-2 touch-manipulation"
                onClick={() => navigate("/add-transaction")}
              >

                <PlusCircle className="mobile-icon-sm" strokeWidth={1.5} />

                Add
              </Button>
            </div>
          </div>


          <Card className="p-0 bg-card border-border">
            <div className="p-4 border-b border-border bg-card">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />

                  <Input
                    placeholder="Search transactions..."
                    className="pl-9 bg-background border-input text-foreground placeholder:text-muted-foreground"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">

                  <Select

                    value={selectedType}
                    onValueChange={handleTypeChange}
                  >
                    <SelectTrigger className="w-full min-w-[100px] sm:w-[140px] bg-background border-input text-foreground">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="all" className="text-foreground">All Types</SelectItem>
                      <SelectItem value="credit" className="text-foreground">Income</SelectItem>
                      <SelectItem value="debit" className="text-foreground">Expense</SelectItem>
                      <SelectItem value="savings" className="text-foreground">Savings</SelectItem>
                    </SelectContent>
                  </Select>


                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"

                        size="compact"
                        className="w-full min-w-[100px] sm:w-[140px] justify-between bg-background border-input text-foreground hover:bg-accent"
                      >
                        <div className="flex items-center gap-2">

                          <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />

                          Categories
                        </div>
                        {selectedCategories.length > 0 && (
                          <Badge variant="secondary" className="ml-2 h-5 text-xs">
                            {selectedCategories.length}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 bg-popover border-border z-50 max-h-[80vh] flex flex-col overflow-hidden" align="end">
                      <div className="p-4 border-b border-border bg-popover flex-shrink-0">
                        <h4 className="font-medium text-foreground mb-2">Categories</h4>
                        <div className="flex items-center justify-between">

                          <div
                            className={`flex items-center p-2 rounded-md cursor-pointer transition-colors text-sm ${selectedCategories.length === 0
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted/50 text-muted-foreground"
                              }`}
                            onClick={clearAllCategories}
                          >
                            <Shapes className="h-4 w-4 mr-3" strokeWidth={1.5} />
                            <span>All Categories</span>
                          </div>
                          {selectedCategories.length > 0 && (
                            <Button
                              variant="ghost"
                              size="xs"

                              onClick={clearAllCategories}
                              className="h-auto p-1 text-muted-foreground hover:text-foreground"
                            >
                              Clear all
                            </Button>
                          )}
                        </div>
                      </div>



                      <div className="flex flex-col flex-1 min-h-0">
                        <div className="p-4 pb-2 bg-popover flex-shrink-0">
                          <h5 className="text-sm font-medium text-muted-foreground">Select Categories</h5>
                        </div>
                        <div className="px-4 pb-4 flex-1 overflow-y-auto">
                          <div className="space-y-1">
                            {availableCategories.map((categoryItem) => {
                              const isSelected = selectedCategories.includes(categoryItem.name);

                              return (

                                <div
                                  key={categoryItem.name}
                                  className={`flex items-center p-2 rounded-md cursor-pointer transition-colors text-sm ${isSelected
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-muted/50 text-foreground"
                                    }`}
                                  onClick={() => toggleCategory(categoryItem.name)}
                                >
                                  <Shapes className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />

                                  <span className="truncate flex-1">
                                    {categoryItem.name}
                                  </span>
                                </div>
                              );
                            })}
                            {availableCategories.length === 0 && (
                              <div className="p-4 text-center text-muted-foreground text-sm">
                                No categories found
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>


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


              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedCategories.map((category) => (
                    <Badge
                      key={category}
                      variant="secondary"
                      className="flex items-center gap-1 bg-primary/10 text-primary border-primary/20"
                    >
                      {category}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => toggleCategory(category)}
                        strokeWidth={1.5}

                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {!navigator.onLine && (
              <div className="px-4 py-2 bg-orange-50 dark:bg-orange-950 border-b border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  You're offline. Changes will sync when connection is restored.
                </p>
              </div>
            )}

            {isLoading ? (
              <div className="bg-card rounded-lg">
                <LoadingState size="lg" message="Loading transactions..." />
              </div>
            ) : Object.keys(groupedTransactions).length > 0 ? (
              <div className="divide-y divide-border">
                {Object.entries(groupedTransactions).map(([month, days]) => {
                  const { income, expense } = getMonthlyTotals(month);
                  const allDayTransactions = Object.values(days).flat();


                  return (
                    <div key={month} className="transaction-month-group">
                      <div

                        className={`bg-muted/50 dark:bg-muted/20 p-4 border-b border-border ${selectionMode ? 'cursor-pointer hover:bg-muted/70 dark:hover:bg-muted/30' : ''}`}
                        onClick={(e) => selectionMode ? selectAllInMonth(allDayTransactions, e) : undefined}
                      >
                        <div className="flex flex-col">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-foreground">{month}</span>
                            {selectionMode && (

                              <div className={`h-4 w-4 rounded-sm border-2 border-primary ${allDayTransactions.every(t => selectedTransactions.includes(t.id))
                                ? 'bg-primary'
                                : allDayTransactions.some(t => selectedTransactions.includes(t.id))
                                  ? 'bg-primary/30'
                                  : 'bg-background'
                                }`}></div>

                            )}
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                            <div>In: {currencySymbol}{formatAmount(income)}</div>
                            <div>Out: {currencySymbol}{formatAmount(expense)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y divide-border">
                        {Object.entries(days)
                          .sort(([dayA], [dayB]) => new Date(dayB).getTime() - new Date(dayA).getTime())
                          .map(([day, dayTransactions]) => (
                            <div key={day} className="transaction-day-group">

                              <div

                                className={`px-4 py-2 bg-muted/30 dark:bg-muted/10 border-b border-border text-sm text-muted-foreground flex items-center justify-between ${selectionMode ? 'cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/20' : ''}`}
                                onClick={(e) => selectionMode ? selectAllInDay(dayTransactions, e) : undefined}
                              >
                                <span className="text-foreground">{format(new Date(day), "EEEE, MMM d")}</span>


                                {selectionMode && (
                                  <div className={`h-4 w-4 rounded-sm border-2 border-primary ${dayTransactions.every(t => selectedTransactions.includes(t.id))
                                    ? 'bg-primary'
                                    : dayTransactions.some(t => selectedTransactions.includes(t.id))
                                      ? 'bg-primary/30'
                                      : 'bg-background'
                                    }`}></div>

                                )}
                              </div>

                              <div className="divide-y divide-border">
                                {dayTransactions.map((transaction) => {
                                  const syncStatus = getTransactionSyncStatus(transaction.id);


                                  return (
                                    <div
                                      key={transaction.id}
                                      className={`transaction-row p-4 flex items-center gap-4 bg-card hover:bg-accent/50 dark:hover:bg-accent/20 transition-all ${selectionMode ? 'cursor-pointer' : ''}`}
                                      onClick={() => selectionMode
                                        ? toggleTransactionSelection(transaction.id)

                                        : handleEdit(transaction)
                                      }
                                    >
                                      {selectionMode && (

                                        <div
                                          className={`h-5 w-5 shrink-0 rounded-sm border-2 border-primary ${selectedTransactions.includes(transaction.id) ? 'bg-primary' : 'bg-background'
                                            }`}

                                        />
                                      )}

                                      <div className="flex-shrink-0">
                                        {renderTransactionIcon(transaction.type as TransactionType)}
                                      </div>


                                      <div className="flex-1 flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                          <p className="font-semibold text-base leading-tight text-foreground">

                                            {transaction.description}
                                          </p>
                                          <PendingSyncIndicator status={syncStatus} size="sm" />
                                        </div>

                                        <p className="text-sm text-muted-foreground leading-none">

                                          {transaction.category}
                                        </p>
                                      </div>

                                      <div

                                        className={`text-right ${transaction.type === "credit"
                                          ? "text-green-600 dark:text-green-400"
                                          : transaction.type === "debit"
                                            ? "text-red-600 dark:text-red-400"
                                            : "text-blue-600 dark:text-blue-400"
                                          }`}
                                      >
                                        <p className="font-semibold text-base leading-tight">
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
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={PlusCircle}
                title="No transactions found"
                description="Start tracking your finances by adding your first transaction. You can add income, expenses, or savings."
                actionLabel="Add your first transaction"
                onAction={() => navigate("/add-transaction")}
              />
            )}


            {/* Infinite scroll loader */}
            <div ref={observerTarget} className="h-10 flex items-center justify-center p-4">
              {isFetchingNextPage && <LoadingState size="sm" message="Loading more..." />}
            </div>

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


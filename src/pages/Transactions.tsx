
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { cn, formatFulfillmentDescription } from "@/lib/utils";

import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Trash, ArrowUp, ArrowDown, RefreshCcw, Archive, Trash2, Edit, Calendar, X, TrendingUp, TrendingDown, PiggyBank, Upload, Banknote, Landmark, ArrowDownToLine, ArrowUpFromLine, Repeat, LayoutGrid, ListFilter, FileUp, CirclePlus, BoxSelect, ArchiveRestore, Wallet, CreditCard, Receipt, Filter, SlidersHorizontal, Shapes, Lock, Check } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from "date-fns";
import { Transaction, TransactionType } from "@/types/transactions";
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
import { StatementImporter } from "@/components/reports/StatementImporter";
import PageHeader from "@/components/ui/page-header";

const TransactionsPage = () => {
  const { currency, formatValue } = useSettings();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<"all" | TransactionType>("all");
  const [isImportOpen, setIsImportOpen] = useState(false);
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
  const { categories: subscriptionCategories } = useCategories('subscription');



  // Get categories based on selected transaction type
  const availableCategories = useMemo(() => {
    if (selectedType === "all") {
      const categoriesWithType = [
        ...expenseCategories.map(cat => ({ name: cat, type: 'debit' as TransactionType })),
        ...incomeCategories.map(cat => ({ name: cat, type: 'credit' as TransactionType })),
        ...savingsCategories.map(cat => ({ name: cat, type: 'savings' as TransactionType })),
        ...subscriptionCategories.map(cat => ({ name: cat, type: 'subscription' as TransactionType }))
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
    } else if (selectedType === "subscription") {
      return subscriptionCategories.map(cat => ({ name: cat, type: 'subscription' as TransactionType }));
    }
    return [];
  }, [selectedType, expenseCategories, incomeCategories, savingsCategories]);

  const [showFilters, setShowFilters] = useState(false);

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

  // Memoized filtered transactions — avoids re-filtering on every unrelated state change
  const filteredTransactions = useMemo(() => transactions?.filter((transaction: Transaction) => {
    const matchesSearch =
      transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(transaction.category);
    const matchesType = selectedType === "all" || transaction.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  }), [transactions, searchQuery, selectedCategories, selectedType]);

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

  // Memoized grouped transactions — only recomputed when filtered list changes
  const groupedTransactions = useMemo(() => filteredTransactions?.reduce((groups, transaction: Transaction) => {
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
  }, {} as Record<string, Record<string, Transaction[]>>) || {}, [filteredTransactions]);

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
            } else if (transaction.type === 'debit' || transaction.type === 'subscription') {
              expense += transaction.amount;
            }
          });
        }
      });
    }
    return { income, expense };
  };

  const formatAmount = useCallback((amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <ArrowDownToLine className="h-4 w-4 text-emerald-500" strokeWidth={1.5} />;
      case 'debit':
        return <ArrowUpFromLine className="h-4 w-4 text-rose-500" strokeWidth={1.5} />;
      case 'savings':
        return <Landmark className="h-4 w-4 text-sky-500" strokeWidth={1.5} />;
      case 'subscription':
        return <Repeat className="h-4 w-4 text-violet-500" strokeWidth={1.5} />;
      default:
        return <Banknote className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />;
    }
  };

  const currencySymbol = currency?.symbol || "$";

  return (
    <PullToRefresh onRefresh={handleRefresh} containerClassName="h-full">
      <div className="space-y-6 pb-24">

        <PageHeader
          title="Transactions"
          backTo="/dashboard"
          actions={
            <div className="flex gap-1.5">
              {selectionMode && selectedTransactions.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="compact"
                    className="flex items-center gap-1.5 text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border-none rounded-lg px-3.5 py-1.5 transition-all"
                    onClick={() => setConfirmArchiveOpen(true)}
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Archive ({selectedTransactions.length})
                  </Button>
                  <Button
                    variant="destructive"
                    size="compact"
                    className="flex items-center gap-1.5 text-xs border-none rounded-lg px-3.5 py-1.5 transition-all"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Delete ({selectedTransactions.length})
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="compact"
                className="flex items-center gap-1.5 text-xs bg-muted/40 hover:bg-muted/65 text-foreground border-none rounded-lg px-3.5 py-1.5 transition-all"
                onClick={() => setIsImportOpen(true)}
              >
                <FileUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                Import
              </Button>
              <Button
                size="compact"
                className="flex items-center gap-1.5 text-xs border-none rounded-lg px-3.5 py-1.5 transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => navigate("/add-transaction")}
              >
                <CirclePlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Add
              </Button>
            </div>
          }
        />


        {/* Filter Toolbar */}
        <div className="p-3.5 bg-card/40 backdrop-blur-sm rounded-2xl">
            <div className="flex gap-2 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" strokeWidth={1.5} />

                <Input
                  placeholder="Search transactions..."
                  className="pl-11 bg-background/50 hover:bg-background/85 focus-visible:bg-background border-none rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Button
                variant={showFilters ? "secondary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                size="icon"
                className="rounded-xl border-none bg-background/50 h-10 w-10 shrink-0"
                title="Toggle Filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>

            {(showFilters || searchQuery) && (
              <div className="flex flex-wrap gap-2 mt-3 animate-fadeIn">
                <Select
                  value={selectedType}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger className="w-[125px] bg-background/50 hover:bg-background/85 border-none rounded-xl text-xs text-foreground transition-all focus:ring-0 focus:ring-offset-0 h-9">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-none shadow-lg rounded-xl">
                    <SelectItem value="all" className="text-foreground text-xs">All Types</SelectItem>
                    <SelectItem value="credit" className="text-foreground text-xs">Income</SelectItem>
                    <SelectItem value="debit" className="text-foreground text-xs">Expense</SelectItem>
                    <SelectItem value="savings" className="text-foreground text-xs">Savings</SelectItem>
                    <SelectItem value="subscription" className="text-foreground text-xs">Subscriptions</SelectItem>
                  </SelectContent>
                </Select>


                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="compact"
                      className="w-[125px] justify-between bg-background/50 hover:bg-background/85 border-none rounded-xl text-xs text-foreground transition-all hover:text-foreground h-9"
                    >
                      <div className="flex items-center gap-1">
                        <ListFilter className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Categories
                      </div>
                      {selectedCategories.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 text-[9px] px-1">
                          {selectedCategories.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 bg-popover border-none shadow-lg rounded-xl z-50 max-h-[45vh] flex flex-col overflow-hidden" align="end">
                    <div className="p-4 bg-popover flex-shrink-0">
                      <h4 className="font-medium text-foreground mb-2">Categories</h4>
                      <div className="flex items-center justify-between">

                        <div
                          className={`flex items-center p-2 rounded-md cursor-pointer transition-colors text-sm ${selectedCategories.length === 0
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/50 text-muted-foreground"
                            }`}
                          onClick={clearAllCategories}
                        >
                          <LayoutGrid className="h-4 w-4 mr-3" strokeWidth={1.5} />
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
                      <div className="px-4 pb-4 flex-1 overflow-y-auto" style={{ maxHeight: '300px' }}>
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
                                <LayoutGrid className="h-4 w-4 mr-3 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />

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
                  size="compact"
                  className={cn(
                    "border-none rounded-xl text-xs transition-all h-9 px-3",
                    selectionMode ? "bg-secondary text-secondary-foreground" : "bg-background/50 hover:bg-background/85 text-foreground hover:text-foreground"
                  )}
                >
                  <BoxSelect className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                  {selectionMode ? "Cancel" : "Select"}
                </Button>
              </div>
            )}


            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedCategories.map((category) => (
                  <Badge
                    key={category}
                    variant="secondary"
                    className="flex items-center gap-1 bg-primary/10 text-primary border-none rounded-lg px-2 py-0.5"
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

        {/* Transactions List */}
        <Card className="bg-card/25 border-none shadow-none rounded-2xl overflow-hidden">

          {!navigator.onLine && (
            <div className="mx-4 my-2 px-4 py-2.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl border-none">
              <p className="text-sm">
                You're offline. Changes will sync when connection is restored.
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2 px-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="py-3 flex items-center gap-4">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-[55%]" />
                    <Skeleton className="h-3 w-[35%]" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : Object.keys(groupedTransactions).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(groupedTransactions).map(([month, days]) => {
                const { income, expense } = getMonthlyTotals(month);
                const allDayTransactions = Object.values(days).flat();


                return (
                  <div key={month} className="transaction-month-group mt-6 first:mt-2">
                    <div
                      className={`px-6 pt-4 pb-2 ${selectionMode ? 'cursor-pointer' : ''}`}
                      onClick={(e) => selectionMode ? selectAllInMonth(allDayTransactions, e) : undefined}
                    >
                      <div className="flex flex-col">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-foreground uppercase tracking-wider">{month}</span>
                           {selectionMode && (
                             <div className={cn(
                               "h-4.5 w-4.5 rounded border flex items-center justify-center transition-all",
                               (allDayTransactions as Transaction[]).every(t => selectedTransactions.includes(t.id))
                                 ? 'bg-primary border-primary text-primary-foreground'
                                 : (allDayTransactions as Transaction[]).some(t => selectedTransactions.includes(t.id))
                                   ? 'bg-primary/30 border-primary/50'
                                   : 'bg-background border-primary/45'
                             )}>
                               {(allDayTransactions as Transaction[]).every(t => selectedTransactions.includes(t.id)) && (
                                 <Check className="h-3 w-3 stroke-[3] text-primary-foreground" />
                               )}
                             </div>
                           )}
                         </div>
                         <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                           <div className="flex gap-4">
                             <span>In: {formatValue(income)}</span>
                             <span>Out: {formatValue(expense)}</span>
                           </div>
                         </div>
                       </div>
                     </div>

                     <div className="space-y-4">
                       {Object.entries(days)
                         .sort(([dayA], [dayB]) => new Date(dayB).getTime() - new Date(dayA).getTime())
                         .map(([day, dayTransactions]) => {
                           const typedDayTransactions = dayTransactions as Transaction[];
                           return (
                           <div key={day} className="transaction-day-group">

                             <div
                               className={`px-6 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-widest flex items-center justify-between ${selectionMode ? 'cursor-pointer' : ''}`}
                               onClick={(e) => selectionMode ? selectAllInDay(typedDayTransactions, e) : undefined}
                             >
                               <span>{format(new Date(day), "EEEE, MMM d")}</span>

                               {selectionMode && (
                                 <div className={cn(
                                   "h-4.5 w-4.5 rounded border flex items-center justify-center transition-all",
                                   typedDayTransactions.every(t => selectedTransactions.includes(t.id))
                                     ? 'bg-primary border-primary text-primary-foreground'
                                     : typedDayTransactions.some(t => selectedTransactions.includes(t.id))
                                       ? 'bg-primary/30 border-primary/50'
                                       : 'bg-background border-primary/45'
                                 )}>
                                   {typedDayTransactions.every(t => selectedTransactions.includes(t.id)) && (
                                     <Check className="h-3 w-3 stroke-[3] text-primary-foreground" />
                                   )}
                                 </div>
                               )}
                             </div>

                             <div className="space-y-1 px-4">
                               {typedDayTransactions.sort((a, b) => {
                                 const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                 const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                 return timeB - timeA;
                               }).map((transaction) => {
                                 const syncStatus = getTransactionSyncStatus(transaction.id);
                                 const isSelected = selectedTransactions.includes(transaction.id);

                                 return (
                                    <div
                                      key={transaction.id}
                                      className={`transaction-row h-[72px] min-h-[72px] py-3 px-4 flex items-center gap-3 rounded-[16px] transition-all border-b border-border-subtle ${
                                        transaction.is_locked
                                          ? 'opacity-85 cursor-not-allowed hover:bg-transparent'
                                          : isSelected
                                            ? 'bg-brand-primary/10 border border-brand-primary/30 shadow-sm'
                                            : 'bg-bg-surface hover:bg-bg-card-hover ' + (selectionMode ? 'cursor-pointer' : '')
                                      }`}
                                      onClick={() => {
                                        if (transaction.is_locked) {
                                          toast({
                                            title: "Read-Only Transaction 🔒",
                                            description: "This transaction is locked to protect your Fresh Start financial baseline.",
                                          });
                                          return;
                                        }
                                        if (selectionMode) {
                                          toggleTransactionSelection(transaction.id);
                                        } else {
                                          handleEdit(transaction);
                                        }
                                      }}
                                    >
                                      {selectionMode && (
                                        <div
                                          className={cn(
                                            "h-5 w-5 shrink-0 rounded-full border flex items-center justify-center transition-all",
                                            isSelected
                                              ? "bg-brand-primary border-brand-primary text-text-on-brand"
                                              : "bg-bg-base border-border-strong hover:border-brand-primary"
                                          )}
                                        >
                                          {isSelected && <Check className="h-3.5 w-3.5 stroke-[3] text-text-on-brand" />}
                                        </div>
                                      )}

                                      {/* Left zone: 40x40 circular container */}
                                      <div className="h-10 w-10 min-h-[40px] min-w-[40px] rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0">
                                        {getTypeIcon(transaction.type)}
                                      </div>

                                      {/* Center zone (flex) */}
                                      <div className="flex-1 flex flex-col justify-center min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="font-semibold text-base leading-tight text-text-heading truncate">
                                            {formatFulfillmentDescription(transaction.description)}
                                          </p>
                                          {transaction.is_locked && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-semantic-warning-border bg-semantic-warning-bg text-semantic-warning-text gap-0.5 shrink-0">
                                              <Lock className="h-2.5 w-2.5" /> Read-Only
                                            </Badge>
                                          )}
                                          <PendingSyncIndicator status={syncStatus} size="sm" />
                                        </div>

                                        <p className="text-xs text-text-tertiary leading-none mt-1 truncate">
                                          {transaction.category}
                                        </p>
                                      </div>

                                      {/* Right zone: tabular amount */}
                                      <div
                                        className={`text-right shrink-0 ${transaction.type === "credit"
                                          ? "text-finance-income font-semibold"
                                          : transaction.type === "debit" || transaction.type === "subscription"
                                            ? "text-finance-expense font-semibold"
                                            : "text-finance-savings font-semibold"
                                          }`}
                                      >
                                        <p className="font-semibold text-base leading-tight font-numeric tracking-tight">
                                          {transaction.type === "credit"
                                            ? "+"
                                            : transaction.type === "debit" || transaction.type === "subscription"
                                              ? "-"
                                              : ""}
                                          {formatValue(transaction.amount)}
                                        </p>
                                      </div>
                                    </div>
                                );
                              })}
                             </div>
                           </div>
                         );
                       })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Receipt}
              title="No transactions found"
              description="Start tracking your finances by adding your first transaction. You can add income, expenses, or savings."
              actionLabel="Add your first transaction"
              onAction={() => navigate("/add-transaction")}
            />
          )}


          {/* Infinite scroll loader */}
          <div ref={observerTarget} className="h-20 flex flex-col items-center justify-center p-6 pb-12">
            {isFetchingNextPage && <LoadingState size="sm" message="Loading more..." />}
          </div>

        </Card>
      </div>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="bg-card border-none shadow-lg rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">

              Are you sure you want to delete {selectedTransactions.length} transaction(s)?

              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background border-none rounded-xl text-foreground hover:bg-accent">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-xl text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmArchiveOpen} onOpenChange={setConfirmArchiveOpen}>
        <AlertDialogContent className="bg-card border-none shadow-lg rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirm Archive</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">

              Are you sure you want to archive {selectedTransactions.length} transaction(s)?

              Archived transactions can be restored from the Settings page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background border-none rounded-xl text-foreground hover:bg-accent">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-orange-600 hover:bg-orange-700 rounded-xl text-white">
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <StatementImporter 
        open={isImportOpen} 
        onOpenChange={setIsImportOpen} 
        onImportComplete={refetchTransactions} 
      />
    </PullToRefresh>
  );
};

export default TransactionsPage;


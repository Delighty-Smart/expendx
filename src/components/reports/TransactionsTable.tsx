import { useState, useMemo, useEffect, useRef } from "react";
import { Transaction, TransactionType } from "@/types/transactions";
import { Currency } from "@/lib/currencies";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ArrowUp, ArrowDown, SlidersHorizontal, X, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useSettings } from "@/contexts/SettingsContext";
import { formatFulfillmentDescription } from "@/lib/utils";

interface TransactionsTableProps {
  transactions: Transaction[];
  currency: Currency;
  onRefresh?: () => Promise<void>;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

const TransactionsTable = ({
  transactions,
  currency,
  onRefresh,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
}: TransactionsTableProps) => {
  const { showLifeHours, trueHourlyRate } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | TransactionType>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const observerRef = useRef<HTMLDivElement>(null);

  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    if (!fetchNextPage || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);



  // Get categories based on selected transaction type
  const { categories: expenseCategories } = useCategories('debit');
  const { categories: incomeCategories } = useCategories('credit');
  const { categories: savingsCategories } = useCategories('savings');
  const { categories: subscriptionCategories } = useCategories('subscription');


  // Get available categories based on selected type
  const availableCategories = useMemo(() => {
    let categories: string[] = [];


    if (selectedType === "all") {
      // Combine all categories and remove duplicates
      const allCats = [...expenseCategories, ...incomeCategories, ...savingsCategories, ...subscriptionCategories];
      categories = [...new Set(allCats)];
    } else if (selectedType === "debit") {
      categories = expenseCategories;
    } else if (selectedType === "credit") {
      categories = incomeCategories;
    } else if (selectedType === "savings") {
      categories = savingsCategories;
    } else if (selectedType === "subscription") {
      categories = subscriptionCategories;
    }


    return categories.sort();
  }, [selectedType, expenseCategories, incomeCategories, savingsCategories]);

  const filteredTransactions = transactions.filter(transaction => {
    // Enhanced search that includes category matching
    const matchesSearch = searchQuery ?

      transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesType = selectedType === "all" || transaction.type === selectedType;
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(transaction.category);
    return matchesSearch && matchesType && matchesCategory;
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

  const formatAmount = (amount: number) => {
    if (showLifeHours) {
      const hrs = amount / trueHourlyRate;
      return hrs.toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }) + " hrs";
    }
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Group transactions by month and day
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const month = format(new Date(transaction.date), "MMM yyyy");
    if (!groups[month]) {
      groups[month] = {};
    }



    const day = format(new Date(transaction.date), "yyyy-MM-dd");
    if (!groups[month][day]) {
      groups[month][day] = [];
    }



    groups[month][day].push(transaction);
    return groups;
  }, {} as Record<string, Record<string, Transaction[]>>);

  // Calculate total for each day
  const getDayTotals = (dayTransactions: Transaction[]) => {
    let income = 0;
    let expense = 0;

    dayTransactions.forEach(transaction => {
      if (transaction.type === 'credit') {
        income += transaction.amount;
      } else if (transaction.type === 'debit') {
        expense += transaction.amount;
      }
    });

    return { income, expense };
  };

  // Calculate total for each month
  const getMonthlyTotals = (month: string) => {
    let income = 0;
    let expense = 0;

    Object.values(groupedTransactions[month]).forEach(dayTransactions => {
      const dayTotals = getDayTotals(dayTransactions);
      income += dayTotals.income;
      expense += dayTotals.expense;
    });

    return { income, expense };
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  const renderTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'credit':

        return <ArrowDown className="h-4 w-4 text-green-500" strokeWidth={1.5} />;
      case 'debit':
        return <ArrowUp className="h-4 w-4 text-red-500" strokeWidth={1.5} />;
      case 'savings':
        return <PiggyBank className="h-4 w-4 text-blue-600" strokeWidth={1.5} />;
      case 'subscription':
        return <TrendingDown className="h-4 w-4 text-purple-500" strokeWidth={1.5} />;

      default:
        return null;
    }
  };

  // Ensure we have a valid currency symbol
  const currencySymbol = currency?.symbol || "$";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

          <Input
            placeholder="Search transactions..."
            className="pl-9 bg-background border-input text-foreground placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}

          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            value={selectedType}
            onValueChange={(value: "all" | TransactionType) => setSelectedType(value)}
          >
            <SelectTrigger className="w-full min-w-[100px] sm:w-[140px] bg-background border-input text-foreground">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all" className="text-foreground">All Types</SelectItem>
              <SelectItem value="credit" className="text-foreground">Income</SelectItem>
              <SelectItem value="debit" className="text-foreground">Expense</SelectItem>
              <SelectItem value="savings" className="text-foreground">Savings</SelectItem>
              <SelectItem value="subscription" className="text-foreground">Subscriptions</SelectItem>
            </SelectContent>
          </Select>


          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"

                size="compact"
                className="w-full min-w-[100px] sm:w-[140px] justify-between bg-background border-input text-foreground hover:bg-accent touch-manipulation"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <SlidersHorizontal className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate text-sm sm:text-base">Categories</span>
                </div>
                {selectedCategories.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 text-xs flex-shrink-0">
                    {selectedCategories.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-popover border-border shadow-lg z-50" align="end">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">Filter by Categories</h4>
                  {selectedCategories.length > 0 && (

                    <Button
                      variant="ghost"
                      size="sm"

                      onClick={clearAllCategories}
                      className="h-auto p-1 text-muted-foreground hover:text-foreground touch-manipulation"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {availableCategories.map((category) => {
                  const isSelected = selectedCategories.includes(category);


                  return (
                    <div
                      key={category}
                      className={`flex items-center space-x-3 p-3 rounded-md cursor-pointer transition-colors touch-manipulation ${isSelected
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-accent/50'
                        }`}

                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <div className="h-2 w-2 rounded-full bg-primary/60 flex-shrink-0"></div>

                        <label className={`text-sm cursor-pointer select-none transition-colors ${isSelected ? 'text-primary font-medium' : 'text-foreground'
                          }`}>

                          {category}
                        </label>
                      </div>
                    </div>
                  );
                })}
                {availableCategories.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No categories found
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>


      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
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
              />
            </Badge>
          ))}
        </div>
      )}


      <PullToRefresh
        onRefresh={handleRefresh}

        containerClassName="transactions-container"
      >
        {Object.keys(groupedTransactions).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedTransactions).map(([month, days]) => {
              const { income, expense } = getMonthlyTotals(month);



              return (
                <Card key={month} className="transaction-month-group overflow-hidden border-border/40 bg-card">
                  {/* Month header */}
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 border-b border-border/10">
                    <div className="flex flex-col">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{month}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                        <div>
                          In: {!showLifeHours && currencySymbol}{formatAmount(income)}
                        </div>
                        <div>
                          Out: {!showLifeHours && currencySymbol}{formatAmount(expense)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Days and transactions */}
                  <div className="space-y-6">
                    {Object.entries(days)
                      .sort(([dayA], [dayB]) => new Date(dayB).getTime() - new Date(dayA).getTime())
                      .map(([day, dayTransactions]) => {
                        const { income, expense } = getDayTotals(dayTransactions);

                        return (
                          <div key={day} className="transaction-day-group overflow-hidden">
                            {/* Summary Header */}
                            <div className="bg-white dark:bg-slate-900 rounded-t-[24px] px-6 py-4 flex justify-between items-center border-b border-border/5 shadow-sm">
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                In: <span className="ml-1 text-slate-500 dark:text-slate-400">{!showLifeHours && currencySymbol}{formatAmount(income)}</span>
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                Out: <span className="ml-1 text-slate-500 dark:text-slate-400">{!showLifeHours && currencySymbol}{formatAmount(expense)}</span>
                              </span>
                            </div>

                            {/* Date Header */}
                            <div className="px-6 py-2.5 bg-slate-400 dark:bg-slate-700 text-[10px] font-bold text-slate-50 dark:text-slate-300 uppercase tracking-[0.15em]">
                              <span>{format(new Date(day + 'T12:00:00'), "EEEE, MMM d")}</span>
                            </div>

                            {/* Transaction List Container */}
                            <div className="bg-white dark:bg-slate-900/40 divide-y divide-border/20 rounded-b-[24px]">
                              {dayTransactions.map((transaction) => (
                                <div
                                  key={transaction.id}
                                  className="transaction-row p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex-shrink-0">
                                    {renderTransactionIcon(transaction.type)}
                                  </div>

                                  <div className="flex-1 flex flex-col min-w-0">
                                    <p className="font-semibold text-[15px] leading-tight text-foreground truncate">
                                      {formatFulfillmentDescription(transaction.description)}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground/80 leading-none mt-1 font-medium">
                                      {transaction.category}
                                    </p>
                                  </div>

                                  <div className={`text-right ${transaction.type === "credit"
                                    ? "text-emerald-500"
                                    : transaction.type === "debit"
                                      ? "text-red-500"
                                      : "text-blue-500"
                                    }`}>
                                    <p className="font-bold text-[15px] leading-tight">
                                      {transaction.type === "debit" ? "-" : transaction.type === "credit" ? "+" : ""}
                                      {!showLifeHours && currencySymbol}{formatAmount(transaction.amount)}
                                    </p>
                                    <p className="text-[10px] text-slate-400/80 leading-none mt-1 font-medium">
                                      {format(new Date(transaction.date), "HH:mm")}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </Card>
              );
            })}

            {/* Infinite Scroll Trigger */}
            <div ref={observerRef} className="h-10 flex items-center justify-center">
              {isFetchingNextPage && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No transactions found for the selected filters
          </div>
        )}
      </PullToRefresh>
    </div>
  );
};

export { TransactionsTable };
export default TransactionsTable;


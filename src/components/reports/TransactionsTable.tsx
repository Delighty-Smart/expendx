
import { useState, useMemo } from "react";
import { Transaction, TransactionType } from "@/types/transactions";
import { Currency } from "@/lib/currencies";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ArrowUp, ArrowDown, Filter, X, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";

interface TransactionsTableProps {
  transactions: Transaction[];
  currency: Currency;
  onRefresh?: () => Promise<void>;
}

const TransactionsTable = ({ transactions, currency, onRefresh }: TransactionsTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | TransactionType>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const isMobile = useIsMobile();
  
  // Get categories based on selected transaction type
  const { categories: expenseCategories } = useCategories('debit');
  const { categories: incomeCategories } = useCategories('credit');
  const { categories: savingsCategories } = useCategories('savings');
  
  // Get available categories based on selected type
  const availableCategories = useMemo(() => {
    let categories: string[] = [];
    
    if (selectedType === "all") {
      // Combine all categories and remove duplicates
      const allCats = [...expenseCategories, ...incomeCategories, ...savingsCategories];
      categories = [...new Set(allCats)];
    } else if (selectedType === "debit") {
      categories = expenseCategories;
    } else if (selectedType === "credit") {
      categories = incomeCategories;
    } else if (selectedType === "savings") {
      categories = savingsCategories;
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

  // Calculate total for each month
  const getMonthlyTotals = (month: string) => {
    let income = 0;
    let expense = 0;
    
    Object.values(groupedTransactions[month]).forEach(dayTransactions => {
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

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  const renderTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'credit':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'debit':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'savings':
        return <PiggyBank className="h-4 w-4 text-blue-600" />;
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
                  <Filter className="h-4 w-4 flex-shrink-0" />
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
                      className={`flex items-center space-x-3 p-3 rounded-md cursor-pointer transition-colors touch-manipulation ${
                        isSelected 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <div className="h-2 w-2 rounded-full bg-primary/60 flex-shrink-0"></div>
                        <label className={`text-sm cursor-pointer select-none transition-colors ${
                          isSelected ? 'text-primary font-medium' : 'text-foreground'
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
                <Card key={month} className="transaction-month-group overflow-hidden">
                  {/* Month header */}
                  <div className="bg-gray-50 p-3 border-b">
                    <div className="flex flex-col">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{month}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
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
                  <div className="divide-y">
                    {Object.entries(days)
                      .sort(([dayA], [dayB]) => new Date(dayB).getTime() - new Date(dayA).getTime())
                      .map(([day, dayTransactions]) => (
                        <div key={day} className="transaction-day-group">
                          <div className="px-3 py-2 bg-gray-50/50 border-t text-xs text-muted-foreground">
                            {format(new Date(day), "EEEE, MMM d")}
                          </div>
                          
                          <div className="divide-y">
                            {dayTransactions.map((transaction) => (
                              <div 
                                key={transaction.id} 
                                className="transaction-row p-3 flex items-center gap-3"
                              >
                                <div className="flex-shrink-0">
                                  {renderTransactionIcon(transaction.type)}
                                </div>
                                
                                <div className="flex-1 flex flex-col">
                                  <p className="font-medium text-sm leading-tight">
                                    {transaction.description}
                                  </p>
                                  <p className="text-xs text-muted-foreground leading-none mt-1">
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
                                  <p className="font-medium text-sm leading-tight">
                                    {transaction.type === "debit" ? "-" : "+"}
                                    {currencySymbol}{formatAmount(transaction.amount)}
                                  </p>
                                  <p className="text-xs text-muted-foreground leading-none mt-1">
                                    {format(new Date(transaction.date), "HH:mm")}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              );
            })}
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

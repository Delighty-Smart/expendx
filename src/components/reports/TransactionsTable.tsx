
import { useState } from "react";
import { Transaction, TransactionType } from "@/types/transactions";
import { Currency } from "@/lib/currencies";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ArrowUp, ArrowDown, RefreshCcw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { Checkbox } from "@/components/ui/checkbox";

interface TransactionsTableProps {
  transactions: Transaction[];
  currency: Currency;
  onRefresh?: () => Promise<void>;
}

const TransactionsTable = ({ transactions, currency, onRefresh }: TransactionsTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | TransactionType>("all");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const isMobile = useIsMobile();
  
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchQuery ? transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) : true;
    const matchesType = selectedType === "all" || transaction.type === selectedType;
    return matchesSearch && matchesType;
  });

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

  const handleSelectTransaction = (id: string, checked: boolean) => {
    setSelectedTransactions(prev => 
      checked ? [...prev, id] : prev.filter(transId => transId !== id)
    );
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
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

  return (
    <div className="space-y-4">
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

        <Select
          value={selectedType}
          onValueChange={(value: "all" | TransactionType) => setSelectedType(value)}
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
                          <div className="px-3 py-2 bg-gray-50/50 border-t text-xs text-muted-foreground">
                            {format(new Date(day), "EEEE, MMM d")}
                          </div>
                          
                          <div className="divide-y">
                            {dayTransactions.map((transaction) => (
                              <div 
                                key={transaction.id} 
                                className="transaction-row p-3 flex items-center gap-3"
                              >
                                <Checkbox 
                                  size="sm"
                                  checked={selectedTransactions.includes(transaction.id)}
                                  onCheckedChange={(checked) => 
                                    handleSelectTransaction(transaction.id, checked === true)
                                  }
                                />
                                
                                <div className="flex-shrink-0">
                                  {renderTransactionIcon(transaction.type)}
                                </div>
                                
                                <div className="flex-1">
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
                                    {currency.symbol}{formatAmount(transaction.amount)}
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

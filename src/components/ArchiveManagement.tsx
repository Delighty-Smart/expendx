import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Search, RotateCcw, ArrowUp, ArrowDown, Trash } from "lucide-react";
import { TransactionType } from "@/types/transactions";
import { useSettings } from "@/contexts/SettingsContext";
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

interface ArchivedTransaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  archived: boolean;
}

export const ArchiveManagement = () => {
  const [archivedTransactions, setArchivedTransactions] = useState<ArchivedTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | TransactionType>("all");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmUnarchiveOpen, setConfirmUnarchiveOpen] = useState(false);
  const [confirmUnarchiveAllOpen, setConfirmUnarchiveAllOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { toast } = useToast();
  const { currency } = useSettings();

  const fetchArchivedTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("archived", true)
        .order("date", { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData: ArchivedTransaction[] = (data || []).map(transaction => ({
        id: transaction.id,
        date: transaction.date,
        amount: transaction.amount,
        type: transaction.type as TransactionType,
        category: transaction.category,
        description: transaction.description,
        archived: transaction.archived
      }));

      setArchivedTransactions(transformedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch archived transactions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedTransactions();
  }, []);

  const handleUnarchive = async (transactionIds?: string[]) => {
    const idsToUnarchive = transactionIds || selectedTransactions;

    try {
      const { error } = await supabase
        .from("transactions")
        .update({ archived: false })
        .in("id", idsToUnarchive);

      if (error) throw error;

      await fetchArchivedTransactions();
      setSelectedTransactions([]);

      toast({
        title: "Success",
        description: `${idsToUnarchive.length} transaction(s) unarchived successfully`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUnarchiveAll = async () => {
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ archived: false })
        .eq("archived", true);

      if (error) throw error;

      await fetchArchivedTransactions();
      setSelectedTransactions([]);

      toast({
        title: "Success",
        description: "All archived transactions have been unarchived"
      });

      setConfirmUnarchiveAllOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setConfirmUnarchiveAllOpen(false);
    }
  };

  const handleDeletePermanently = async () => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .in("id", selectedTransactions);

      if (error) throw error;

      await fetchArchivedTransactions();
      setSelectedTransactions([]);

      toast({
        title: "Success",
        description: `${selectedTransactions.length} transaction(s) deleted permanently`
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

  const handleUnarchiveByMonth = async (month: string) => {
    const monthTransactions = groupedTransactions[month];
    const monthIds = Object.values(monthTransactions).flat().map(t => t.id);
    await handleUnarchive(monthIds);
  };

  const toggleTransactionSelection = (id: string) => {
    setSelectedTransactions(prev =>
      prev.includes(id) ? prev.filter(transId => transId !== id) : [...prev, id]
    );
  };

  const selectAllInDay = (dayTransactions: ArchivedTransaction[], e: React.MouseEvent) => {
    e.stopPropagation();

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

  const selectAllInMonth = (monthTransactions: ArchivedTransaction[], e: React.MouseEvent) => {
    e.stopPropagation();

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

  const filteredTransactions = archivedTransactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || transaction.type === selectedType;
    return matchesSearch && matchesType;
  });

  // Group transactions by month, then by day (same as main transactions page)
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
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
  }, {} as Record<string, Record<string, ArchivedTransaction[]>>);

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

  const currencySymbol = currency?.symbol || "$";

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Loading archived transactions...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold text-foreground">Archived Transactions</h3>
        <div className="flex gap-2">
          {selectedTransactions.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => setConfirmUnarchiveOpen(true)}
                className="flex items-center gap-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
              >
                <RotateCcw className="h-4 w-4" />
                Unarchive ({selectedTransactions.length})
              </Button>
              <Button
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
                className="flex items-center gap-2"
              >
                <Trash className="h-4 w-4" />
                Delete ({selectedTransactions.length})
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => setConfirmUnarchiveAllOpen(true)}
            disabled={archivedTransactions.length === 0}
            className="bg-background border-input text-foreground hover:bg-accent"
          >
            Unarchive All
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0 bg-card border-border">
        <div className="p-4 border-b border-border bg-card">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search archived transactions..."
                className="pl-9 bg-background border-input text-foreground placeholder:text-muted-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select
              value={selectedType}
              onValueChange={(value: "all" | TransactionType) => setSelectedType(value)}
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
          </div>
        </div>

        {Object.keys(groupedTransactions).length > 0 ? (
          <div className="divide-y divide-border">
            {Object.entries(groupedTransactions).map(([month, days]) => {
              const { income, expense } = getMonthlyTotals(month);
              const allDayTransactions = Object.values(days).flat();

              return (
                <div key={month} className="transaction-month-group">
                  {/* Month header */}
                  <div
                    className="bg-muted/50 dark:bg-muted/20 p-4 border-b border-border cursor-pointer hover:bg-muted/70 dark:hover:bg-muted/30"
                    onClick={(e) => selectAllInMonth(allDayTransactions, e)}
                  >
                    <div className="flex flex-col">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-foreground">{month}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnarchiveByMonth(month);
                            }}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Unarchive Month
                          </Button>
                          <div className={`h-3 w-3 rounded-full border-2 border-primary ${allDayTransactions.every(t => selectedTransactions.includes(t.id))
                            ? 'bg-primary'
                            : allDayTransactions.some(t => selectedTransactions.includes(t.id))
                              ? 'bg-primary/30'
                              : 'bg-background'
                            }`}></div>
                        </div>
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
                      .sort(([dayA], [dayB]) => new Date(dayB).getTime() - new Date(dayA).getTime())
                      .map(([day, dayTransactions]) => (
                        <div key={day} className="transaction-day-group">
                          <div
                            className="px-4 py-2 bg-muted/30 dark:bg-muted/10 border-b border-border text-sm text-muted-foreground flex items-center justify-between cursor-pointer hover:bg-muted/50 dark:hover:bg-muted/20"
                            onClick={(e) => selectAllInDay(dayTransactions, e)}
                          >
                            <span className="text-foreground">{format(new Date(day), "EEEE, MMM d")}</span>
                            <div className={`h-3 w-3 rounded-full border-2 border-primary ${dayTransactions.every(t => selectedTransactions.includes(t.id))
                              ? 'bg-primary'
                              : dayTransactions.some(t => selectedTransactions.includes(t.id))
                                ? 'bg-primary/30'
                                : 'bg-background'
                              }`}></div>
                          </div>

                          <div className="divide-y divide-border">
                            {dayTransactions.map((transaction) => (
                              <div
                                key={transaction.id}
                                className="transaction-row p-4 flex items-center gap-3 bg-card hover:bg-accent/50 dark:hover:bg-accent/20 cursor-pointer"
                                onClick={() => toggleTransactionSelection(transaction.id)}
                              >
                                <Checkbox
                                  size="xs"
                                  checked={selectedTransactions.includes(transaction.id)}
                                  onCheckedChange={(checked) =>
                                    checked ?
                                      setSelectedTransactions(prev => [...prev, transaction.id]) :
                                      setSelectedTransactions(prev => prev.filter(id => id !== transaction.id))
                                  }
                                />

                                <div className="flex-shrink-0">
                                  {renderTransactionIcon(transaction.type)}
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
                                  className={`text-right ${transaction.type === "credit"
                                    ? "text-green-600 dark:text-green-400"
                                    : transaction.type === "debit"
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-blue-600 dark:text-blue-400"
                                    }`}
                                >
                                  <p className="font-medium text-sm leading-tight">
                                    {transaction.type === "credit" ? "+" : transaction.type === "debit" ? "-" : ""}
                                    {currencySymbol}{formatAmount(transaction.amount)}
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
            <p>No archived transactions found</p>
          </div>
        )}
      </Card>

      {/* Confirmation dialogs */}
      <AlertDialog open={confirmUnarchiveOpen} onOpenChange={setConfirmUnarchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Unarchive</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unarchive {selectedTransactions.length} transaction(s)?
              They will be restored to your active transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleUnarchive();
                setConfirmUnarchiveOpen(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Unarchive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmUnarchiveAllOpen} onOpenChange={setConfirmUnarchiveAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Unarchive All</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unarchive all archived transactions?
              This will restore all {archivedTransactions.length} archived transactions to your active transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnarchiveAll} className="bg-blue-600 hover:bg-blue-700 text-white">
              Unarchive All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Permanent Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {selectedTransactions.length} transaction(s)?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePermanently} className="bg-red-600 hover:bg-red-700 text-white">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};


import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Archive, RotateCcw, Search, Calendar, CheckSquare, Square } from "lucide-react";
import { format } from "date-fns";
import { useSettings } from "@/contexts/SettingsContext";
import { useQueryClient } from "@tanstack/react-query";
import { Transaction, TransactionType } from "@/types/transactions";

interface ArchiveOption {
  value: string;
  label: string;
}

const archiveOptions: ArchiveOption[] = [
  { value: "all", label: "Archive All Transactions" },
  { value: "month", label: "Archive by Selected Month" },
  { value: "custom", label: "Custom Selection" }
];

export const ArchiveManagement = () => {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [archivedTransactions, setArchivedTransactions] = useState<Transaction[]>([]);
  const [activeTransactions, setActiveTransactions] = useState<Transaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
  const { toast } = useToast();
  const { currency } = useSettings();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (showArchived) {
      fetchArchivedTransactions();
    } else {
      fetchActiveTransactions();
    }
  }, [showArchived]);

  const fetchArchivedTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", true)
        .order("date", { ascending: false });

      if (error) throw error;
      setArchivedTransactions(data || []);
    } catch (error: any) {
      console.error("Error fetching archived transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load archived transactions",
        variant: "destructive"
      });
    }
  };

  const fetchActiveTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("date", { ascending: false });

      if (error) throw error;
      setActiveTransactions(data || []);
    } catch (error: any) {
      console.error("Error fetching active transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load active transactions",
        variant: "destructive"
      });
    }
  };

  const archiveTransactions = async () => {
    if (!selectedOption) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      let query = supabase
        .from("transactions")
        .update({ archived: true })
        .eq("user_id", user.id)
        .eq("archived", false);

      if (selectedOption === "month" && selectedMonth) {
        const startDate = `${selectedMonth}-01`;
        const endDate = `${selectedMonth}-31`;
        query = query.gte("date", startDate).lte("date", endDate);
      } else if (selectedOption === "custom" && selectedTransactions.length > 0) {
        query = query.in("id", selectedTransactions);
      }

      const { error } = await query;
      if (error) throw error;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Reset selections
      setSelectedOption("");
      setSelectedMonth("");
      setSelectedTransactions([]);
      
      toast({
        title: "Success",
        description: "Transactions archived successfully"
      });
      
      // Refresh the current view
      if (showArchived) {
        fetchArchivedTransactions();
      } else {
        fetchActiveTransactions();
      }
    } catch (error: any) {
      console.error("Error archiving transactions:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to archive transactions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const unarchiveTransactions = async (transactionIds: string[]) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("transactions")
        .update({ archived: false })
        .in("id", transactionIds);

      if (error) throw error;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      toast({
        title: "Success",
        description: "Transactions unarchived successfully"
      });
      
      fetchArchivedTransactions();
    } catch (error: any) {
      console.error("Error unarchiving transactions:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to unarchive transactions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTransactionSelection = (id: string) => {
    setSelectedTransactions(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const filteredTransactions = showArchived 
    ? archivedTransactions.filter(t => 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeTransactions.filter(t => 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Generate month options for the past 12 months
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = format(date, "yyyy-MM");
    const label = format(date, "MMMM yyyy");
    return { value, label };
  });

  return (
    <Card className="p-4 md:p-6 space-y-6 glass-card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Archive Transactions</h3>
        <Button
          variant={showArchived ? "default" : "outline"}
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center gap-2"
        >
          <Archive className="h-4 w-4" />
          {showArchived ? "View Active" : "View Archived"}
        </Button>
      </div>

      {!showArchived ? (
        // Archive Options
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Archive Option</Label>
            <Select value={selectedOption} onValueChange={setSelectedOption}>
              <SelectTrigger>
                <SelectValue placeholder="Select archive option" />
              </SelectTrigger>
              <SelectContent>
                {archiveOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedOption === "month" && (
            <div className="space-y-2">
              <Label>Select Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month to archive" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedOption === "custom" && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleTransactionSelection(transaction.id)}
                  >
                    <div className="flex items-center gap-3">
                      {selectedTransactions.includes(transaction.id) ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-gray-500">
                          {transaction.category} • {format(new Date(transaction.date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <span className={`font-medium text-sm ${
                      transaction.type === "credit" ? "text-green-600" : "text-red-600"
                    }`}>
                      {transaction.type === "credit" ? "+" : "-"}
                      {currency.symbol}{formatAmount(transaction.amount)}
                    </span>
                  </div>
                ))}
              </div>
              
              {selectedTransactions.length > 0 && (
                <p className="text-sm text-gray-600">
                  {selectedTransactions.length} transaction(s) selected
                </p>
              )}
            </div>
          )}

          <Button
            onClick={archiveTransactions}
            disabled={loading || !selectedOption || 
              (selectedOption === "month" && !selectedMonth) ||
              (selectedOption === "custom" && selectedTransactions.length === 0)
            }
            className="w-full flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            {loading ? "Archiving..." : "Archive Transactions"}
          </Button>
        </div>
      ) : (
        // Archived Transactions View
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search archived transactions..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 border rounded-md"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.includes(transaction.id)}
                    onChange={() => toggleTransactionSelection(transaction.id)}
                    className="rounded"
                  />
                  <div>
                    <p className="font-medium text-sm">{transaction.description}</p>
                    <p className="text-xs text-gray-500">
                      {transaction.category} • {format(new Date(transaction.date), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <span className={`font-medium text-sm ${
                  transaction.type === "credit" ? "text-green-600" : "text-red-600"
                }`}>
                  {transaction.type === "credit" ? "+" : "-"}
                  {currency.symbol}{formatAmount(transaction.amount)}
                </span>
              </div>
            ))}
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No archived transactions found
            </div>
          )}

          {selectedTransactions.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-600">
                {selectedTransactions.length} transaction(s) selected
              </p>
              <Button
                onClick={() => unarchiveTransactions(selectedTransactions)}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {loading ? "Unarchiving..." : "Unarchive Selected"}
              </Button>
            </div>
          )}

          {archivedTransactions.length > 0 && (
            <Button
              onClick={() => unarchiveTransactions(archivedTransactions.map(t => t.id))}
              disabled={loading}
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {loading ? "Unarchiving..." : "Unarchive All"}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};


import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Transaction, TransactionType, TransactionCategory } from "@/types/transactions";
import { Archive, Trash2, Search, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";

// Helper to convert database response to Transaction type
const convertToTransaction = (dbTransaction: any): Transaction => ({
  ...dbTransaction,
  type: dbTransaction.type as TransactionType,
  category: dbTransaction.category as TransactionCategory
});

export function ArchiveManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [archivedTransactions, setArchivedTransactions] = useState<Transaction[]>([]);
  const [activeTransactions, setActiveTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"archive" | "unarchive">("archive");

  // Load transactions
  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load archived transactions
      const { data: archived, error: archivedError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", true)
        .order("date", { ascending: false });

      if (archivedError) throw archivedError;
      setArchivedTransactions((archived || []).map(convertToTransaction));

      // Load active transactions for archiving
      const { data: active, error: activeError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("date", { ascending: false });

      if (activeError) throw activeError;
      setActiveTransactions((active || []).map(convertToTransaction));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const archiveAllTransactions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("transactions")
        .update({ archived: true })
        .eq("user_id", user.id)
        .eq("archived", false);

      if (error) throw error;

      toast({
        title: "Success",
        description: "All transactions have been archived"
      });

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      loadTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const archiveByMonth = async () => {
    if (!selectedMonth) {
      toast({
        title: "Error",
        description: "Please select a month",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`;

      const { error } = await supabase
        .from("transactions")
        .update({ archived: true })
        .eq("user_id", user.id)
        .eq("archived", false)
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Transactions for ${selectedMonth} have been archived`
      });

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      loadTransactions();
      setSelectedMonth("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const archiveSelected = async () => {
    if (selectedTransactions.length === 0) {
      toast({
        title: "Error",
        description: "Please select transactions to archive",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("transactions")
        .update({ archived: true })
        .in("id", selectedTransactions);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedTransactions.length} transaction(s) archived`
      });

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      loadTransactions();
      setSelectedTransactions([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const unarchiveSelected = async () => {
    if (selectedTransactions.length === 0) {
      toast({
        title: "Error",
        description: "Please select transactions to unarchive",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from("transactions")
        .update({ archived: false })
        .in("id", selectedTransactions);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedTransactions.length} transaction(s) unarchived`
      });

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      loadTransactions();
      setSelectedTransactions([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionSelect = (transactionId: string) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const filteredTransactions = (viewMode === "archive" ? activeTransactions : archivedTransactions)
    .filter(t => 
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <Card className="p-4 md:p-6 space-y-6 glass-card">
      <div className="flex items-center gap-2">
        <Archive className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Archive Management</h2>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "archive" ? "default" : "outline"}
            onClick={() => {
              setViewMode("archive");
              setSelectedTransactions([]);
            }}
          >
            Archive Transactions
          </Button>
          <Button
            variant={viewMode === "unarchive" ? "default" : "outline"}
            onClick={() => {
              setViewMode("unarchive");
              setSelectedTransactions([]);
            }}
          >
            View Archived ({archivedTransactions.length})
          </Button>
        </div>

        {viewMode === "archive" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={archiveAllTransactions}
                disabled={loading || activeTransactions.length === 0}
                variant="outline"
                className="w-full"
              >
                Archive All Transactions
              </Button>

              <div className="flex gap-2">
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={archiveByMonth}
                  disabled={loading || !selectedMonth}
                  variant="outline"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onClick={archiveSelected}
                disabled={loading || selectedTransactions.length === 0}
                variant="outline"
                className="w-full"
              >
                Archive Selected ({selectedTransactions.length})
              </Button>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[400px] border rounded-md">
          <div className="p-4 space-y-2">
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {viewMode === "archive" 
                  ? "No active transactions found" 
                  : "No archived transactions found"}
              </p>
            ) : (
              filteredTransactions.map(transaction => (
                <div
                  key={transaction.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent"
                >
                  <Checkbox
                    checked={selectedTransactions.includes(transaction.id)}
                    onCheckedChange={() => handleTransactionSelect(transaction.id)}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.category} • {transaction.date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${
                          transaction.type === "credit" ? "text-green-600" : "text-red-600"
                        }`}>
                          {transaction.type === "credit" ? "+" : "-"}${transaction.amount}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {transaction.type}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {viewMode === "unarchive" && selectedTransactions.length > 0 && (
          <Button
            onClick={unarchiveSelected}
            disabled={loading}
            className="w-full"
          >
            Unarchive Selected ({selectedTransactions.length})
          </Button>
        )}
      </div>
    </Card>
  );
}

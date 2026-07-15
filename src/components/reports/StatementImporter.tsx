import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, Check, AlertCircle } from "lucide-react";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface StatementImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface ParsedRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  selected: boolean;
}

export function StatementImporter({
  open,
  onOpenChange,
  onImportComplete
}: StatementImporterProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const parseCSV = (text: string) => {
    try {
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        throw new Error("CSV file is empty or missing headers.");
      }

      // Read header row
      const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/["']/g, ""));
      
      // Auto-detect columns
      const dateIdx = headers.findIndex(h => h.includes("date") || h.includes("time"));
      const descIdx = headers.findIndex(h => h.includes("desc") || h.includes("memo") || h.includes("particular") || h.includes("merchant") || h.includes("narration"));
      const amountIdx = headers.findIndex(h => h.includes("amount") || h.includes("value") || h.includes("sum"));
      const creditIdx = headers.findIndex(h => h.includes("credit") || h.includes("in"));
      const debitIdx = headers.findIndex(h => h.includes("debit") || h.includes("out"));
      const typeIdx = headers.findIndex(h => h.includes("type") || h.includes("direction"));

      if (dateIdx === -1) throw new Error("Could not find a 'Date' column.");
      if (descIdx === -1) throw new Error("Could not find a 'Description' or 'Merchant' column.");
      if (amountIdx === -1 && creditIdx === -1 && debitIdx === -1) {
        throw new Error("Could not find an 'Amount', 'Credit', or 'Debit' column.");
      }

      const rows: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV splitter that respects quoted strings
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/["']/g, ""));
        if (values.length < Math.max(dateIdx, descIdx, amountIdx, creditIdx, debitIdx)) continue;

        const dateStr = values[dateIdx];
        const description = values[descIdx] || "Bank Transaction";
        
        let amount = 0;
        let type: "credit" | "debit" = "debit";

        if (amountIdx !== -1) {
          const rawAmount = parseFloat(values[amountIdx]);
          if (!isNaN(rawAmount)) {
            amount = Math.abs(rawAmount);
            if (rawAmount < 0) {
              type = "debit";
            } else {
              type = "credit";
            }
          }
        } else {
          // Use credit/debit column splits
          const creditVal = parseFloat(values[creditIdx]);
          const debitVal = parseFloat(values[debitIdx]);
          if (!isNaN(creditVal) && creditVal > 0) {
            amount = creditVal;
            type = "credit";
          } else if (!isNaN(debitVal) && debitVal > 0) {
            amount = debitVal;
            type = "debit";
          }
        }

        // Overwrite type if explicit type column is found
        if (typeIdx !== -1 && values[typeIdx]) {
          const typeStr = values[typeIdx].toLowerCase();
          if (typeStr.includes("cr") || typeStr.includes("in") || typeStr.includes("credit") || typeStr.includes("deposit")) {
            type = "credit";
          } else if (typeStr.includes("dr") || typeStr.includes("out") || typeStr.includes("debit") || typeStr.includes("withdrawal")) {
            type = "debit";
          }
        }

        if (amount === 0) continue;

        // Format Date to YYYY-MM-DD
        let formattedDate = new Date().toISOString().split("T")[0];
        try {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            formattedDate = parsedDate.toISOString().split("T")[0];
          }
        } catch (e) {
          // Fallback to today
        }

        // Predict category from description
        let category = type === "credit" ? "Salary" : "Shopping";
        const descLower = description.toLowerCase();
        if (descLower.includes("sub") || descLower.includes("netflix") || descLower.includes("spotify") || descLower.includes("chatgpt")) {
          category = "Subscriptions";
        } else if (descLower.includes("food") || descLower.includes("restaurant") || descLower.includes("canteen") || descLower.includes("eat")) {
          category = "Food & Dining";
        } else if (descLower.includes("uber") || descLower.includes("bolt") || descLower.includes("fuel") || descLower.includes("transport")) {
          category = "Transportation";
        } else if (descLower.includes("rent") || descLower.includes("estate") || descLower.includes("landlord")) {
          category = "Rent & Bills";
        }

        rows.push({
          id: `${i}-${dateStr}-${amount}`,
          date: formattedDate,
          description,
          amount,
          type,
          category,
          selected: true
        });
      }

      if (rows.length === 0) {
        throw new Error("No valid transactions found in the file.");
      }

      setParsedTransactions(rows);
      toast({
        title: "File parsed successfully",
        description: `Found ${rows.length} transactions in statement.`
      });
    } catch (e: unknown) {
      console.error(e);
      toast({
        title: "Parsing error",
        description: e instanceof Error ? e.message : "Failed to parse CSV statement.",
        variant: "destructive"
      });
      setFile(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile);
        const reader = new FileReader();
        reader.onload = (event: ProgressEvent<FileReader>) => {
          if (event.target?.result) {
            parseCSV(event.target.result as string);
          }
        };
        reader.readAsText(droppedFile);
      } else {
        toast({
          title: "Unsupported file type",
          description: "Please upload a valid bank statement CSV file.",
          variant: "destructive"
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        if (event.target?.result) {
          parseCSV(event.target.result as string);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleToggleRow = (id: string) => {
    setParsedTransactions(prev =>
      prev.map(row => (row.id === id ? { ...row, selected: !row.selected } : row))
    );
  };

  const handleToggleAll = () => {
    const allSelected = parsedTransactions.every(row => row.selected);
    setParsedTransactions(prev =>
      prev.map(row => ({ ...row, selected: !allSelected }))
    );
  };

  const handleImport = async () => {
    if (!user) return;
    const selectedRows = parsedTransactions.filter(row => row.selected);
    if (selectedRows.length === 0) {
      toast({
        title: "No selections",
        description: "Please check at least one transaction to import.",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    try {
      for (const row of selectedRows) {
        await enhancedOfflineManager.addTransactionOffline({
          user_id: user.id,
          amount: row.amount,
          type: row.type,
          description: row.description,
          category: row.category,
          date: row.date
        });
      }

      toast({
        title: "Import Complete",
        description: `Imported ${selectedRows.length} transactions successfully.`
      });

      // Clear states
      setFile(null);
      setParsedTransactions([]);
      onOpenChange(false);

      // Invalidate queries to refresh list
      queryClient.invalidateQueries({ queryKey: ["enhanced_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });

      if (onImportComplete) onImportComplete();
    } catch (err: unknown) {
      console.error(err);
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Failed to batch import transactions.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) {
        setFile(null);
        setParsedTransactions([]);
      }
      onOpenChange(v);
    }}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[540px] max-h-[90vh] overflow-hidden flex flex-col p-6 backdrop-blur-xl bg-background/90 border border-border/30 shadow-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Bank Statement Importer
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground/80 leading-relaxed font-medium">
            Upload your OPay or bank transaction statement CSV to batch sync ledger transactions locally.
          </DialogDescription>
        </DialogHeader>

        {parsedTransactions.length === 0 ? (
          /* Drag and Drop Zone */
          <div
            className={cn(
              "mt-4 flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center transition-all duration-300 min-h-[220px]",
              dragActive ? "border-primary bg-primary/5 scale-[0.99]" : "border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/30"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ cursor: "pointer" }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 transition-transform duration-300 group-hover:scale-105">
              <Upload className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-bold text-foreground">Drag statement here or click to upload</p>
            <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px]">
              Supports standard OPay or retail bank CSV statement formats with Date, Narration, and Amount columns.
            </p>
          </div>
        ) : (
          /* Preview List */
          <div className="flex-1 flex flex-col min-h-0 mt-4 space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                Parsed Transactions ({parsedTransactions.length})
              </span>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleToggleAll}
                className="h-7 text-xs font-semibold rounded-lg hover:bg-muted"
              >
                {parsedTransactions.every(row => row.selected) ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <ScrollArea className="flex-1 border border-border/40 bg-muted/10 rounded-2xl p-2 max-h-[350px]">
              <div className="divide-y divide-border/20">
                {parsedTransactions.map(row => (
                  <div
                    key={row.id}
                    onClick={() => handleToggleRow(row.id)}
                    className={cn(
                      "py-2.5 px-3 flex items-center gap-3 cursor-pointer hover:bg-accent/5 transition-all rounded-lg select-none",
                      row.selected ? "opacity-100" : "opacity-45"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                      row.selected ? "bg-primary border-primary text-white" : "border-muted-foreground/40 bg-background"
                    )}>
                      {row.selected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate text-foreground leading-tight">
                        {row.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground/60 font-mono font-medium">
                          {row.date}
                        </span>
                        <span className="text-[9px] px-1 py-0.2 bg-muted rounded font-semibold text-muted-foreground/70 leading-none">
                          {row.category}
                        </span>
                      </div>
                    </div>

                    <span className={cn(
                      "text-xs font-bold font-numeric",
                      row.type === "credit" ? "text-emerald-500" : "text-foreground"
                    )}>
                      {row.type === "credit" ? "+" : "-"}₦{row.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-start gap-2.5 p-3.5 bg-primary/5 rounded-2xl border border-primary/10 text-[11px] text-primary leading-normal">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Verify category labels and items. Unselected transactions will be skipped. Selected transactions will register locally and queue for background sync.
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6 flex gap-2">
          {parsedTransactions.length > 0 && (
            <Button
              variant="ghost"
              className="h-11 rounded-xl font-bold"
              onClick={() => {
                setFile(null);
                setParsedTransactions([]);
              }}
              disabled={importing}
            >
              Reset
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-xl font-bold text-muted-foreground hover:text-foreground"
            disabled={importing}
          >
            Cancel
          </Button>
          {parsedTransactions.length > 0 && (
            <Button
              onClick={handleImport}
              className="h-11 rounded-xl px-6 font-bold"
              disabled={importing}
            >
              {importing ? "Importing..." : `Import Selected (${parsedTransactions.filter(r => r.selected).length})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

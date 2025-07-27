
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { Transaction, TransactionType, getCategoriesForType } from "@/types/transactions";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PendingSyncIndicator } from "./PendingSyncIndicator";
import { useEnhancedOfflineSync } from "@/hooks/useEnhancedOfflineSync";

const transactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["credit", "debit", "savings"] as const),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required")
});

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionAdded?: () => void;
  transaction?: Transaction | null;
}

export const TransactionForm = ({
  open,
  onOpenChange,
  onTransactionAdded,
  transaction
}: TransactionFormProps) => {
  const { toast } = useToast();
  const [transactionType, setTransactionType] = useState<TransactionType>(transaction?.type || "debit");
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { getTransactionSyncStatus } = useEnhancedOfflineSync();
  
  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: transaction?.date || new Date().toISOString().split("T")[0],
      amount: transaction?.amount.toString() || "",
      type: transaction?.type || "debit",
      category: transaction?.category || "",
      description: transaction?.description || ""
    }
  });

  // Helper function to get cached user ID for offline use
  const getCachedUserId = (): string | null => {
    try {
      return localStorage.getItem('cached_user_id');
    } catch (error) {
      console.error("Error getting cached user ID:", error);
      return null;
    }
  };

  // Helper function to cache user ID when online
  const cacheUserId = (userId: string) => {
    try {
      localStorage.setItem('cached_user_id', userId);
    } catch (error) {
      console.error("Error caching user ID:", error);
    }
  };

  // Load categories when transaction type changes
  const loadCategories = useCallback(async (type: TransactionType) => {
    try {
      const fetchedCategories = await getCategoriesForType(type);
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }, []);

  // Initialize form when dialog opens or transaction changes
  useEffect(() => {
    if (open) {
      if (transaction) {
        form.reset({
          date: transaction.date,
          amount: transaction.amount.toString(),
          type: transaction.type,
          category: transaction.category,
          description: transaction.description
        });
        setTransactionType(transaction.type);
        loadCategories(transaction.type);
      } else {
        form.reset({
          date: new Date().toISOString().split("T")[0],
          amount: "",
          type: "debit",
          category: "",
          description: ""
        });
        setTransactionType("debit");
        loadCategories("debit");
      }
    }
  }, [transaction, form, open, loadCategories]);

  // Cache user ID when dialog opens if online
  useEffect(() => {
    const cacheUserIdOnOpen = async () => {
      if (open && navigator.onLine) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            cacheUserId(user.id);
          }
        } catch (error) {
          console.error("Failed to cache user ID on dialog open:", error);
        }
      }
    };
    
    cacheUserIdOnOpen();
  }, [open]);

  const handleTypeChange = useCallback(async (type: TransactionType) => {
    console.log("Type changing to:", type);
    setTransactionType(type);
    form.setValue("type", type);
    form.setValue("category", ""); // Clear category when type changes
    await loadCategories(type);
  }, [form, loadCategories]);

  const onSubmit = useCallback(async (values: z.infer<typeof transactionSchema>) => {
    try {
      setLoading(true);
      
      // Get user ID from cache or auth
      let userId = getCachedUserId();
      if (!userId && navigator.onLine) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          cacheUserId(userId);
        }
      }

      if (!userId) {
        throw new Error("Unable to determine user ID. Please try again when online.");
      }
      
      const transactionData = {
        date: values.date,
        amount: parseFloat(values.amount),
        type: values.type as TransactionType,
        category: values.category,
        description: values.description,
        user_id: userId
      };

      console.log("Saving transaction with enhanced offline support:", transactionData);

      if (transaction) {
        // Update existing transaction
        await enhancedOfflineManager.updateTransactionOffline(transaction.id, transactionData);
        
        const isOffline = !navigator.onLine;
        toast({
          title: "Success",
          description: isOffline ? "Update saved offline and will sync when online" : "Transaction updated successfully"
        });
      } else {
        // Insert new transaction
        await enhancedOfflineManager.addTransactionOffline(transactionData);
        
        const isOffline = !navigator.onLine;
        toast({
          title: "Success",
          description: isOffline ? "Transaction saved offline and will sync when online" : "Transaction added successfully"
        });
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["enhanced_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      
      onOpenChange(false);
      
      if (onTransactionAdded) {
        onTransactionAdded();
      }
    } catch (error: any) {
      console.error("Transaction submission error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast, transaction, onOpenChange, onTransactionAdded, queryClient]);

  const syncStatus = transaction ? getTransactionSyncStatus(transaction.id) : 'synced';

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        form.reset();
      }
      onOpenChange(open);
    }}>
      <DialogContent 
        className={`${isMobile ? 'w-[95%] max-w-[400px]' : 'sm:max-w-[525px]'} mx-auto overflow-hidden max-h-[90vh]`}
      >
        <ScrollArea 
          className="h-full px-1 overflow-y-auto"
          style={{
            overflowY: 'auto',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y'
          }}
        >
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-lg">{transaction ? 'Edit' : 'Add'} Transaction</DialogTitle>
              <PendingSyncIndicator status={syncStatus} />
            </div>
            <DialogDescription className="text-sm">
              Enter the details of your transaction below.
              {!navigator.onLine && (
                <span className="block text-orange-600 mt-1 font-medium">
                  You're offline - changes will sync when connection is restored.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-9" disabled={loading} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Amount</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" step="0.01" {...field} className="h-9" disabled={loading} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Type</FormLabel>
                    <Select
                      onValueChange={handleTypeChange}
                      value={transactionType}
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="credit">Credit (Income)</SelectItem>
                        <SelectItem value="debit">Debit (Expense)</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loading || categories.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={categories.length === 0 ? "Loading categories..." : "Select category"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter transaction details..." 
                        {...field} 
                        className="resize-none text-sm"
                        disabled={loading}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    form.reset();
                    onOpenChange(false);
                  }}
                  className="h-9 text-sm"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="h-9 text-sm"
                  disabled={loading}
                >
                  {loading ? "Saving..." : transaction ? 'Update' : 'Add'} Transaction
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

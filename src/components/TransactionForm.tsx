
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
import { addTransaction, queueTransactionForSync } from "@/services/offlineStorage"; 
import { addTransactionEnhanced } from "@/services/enhancedOfflineStorage";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // Fetch categories when transaction type changes
  useEffect(() => {
    if (open) {
      const loadCategories = async () => {
        try {
          const fetchedCategories = await getCategoriesForType(transactionType);
          setCategories(fetchedCategories);
        } catch (error) {
          console.error("Error loading categories:", error);
        }
      };
      
      loadCategories();
      
      if (transaction) {
        form.reset({
          date: transaction.date,
          amount: transaction.amount.toString(),
          type: transaction.type,
          category: transaction.category,
          description: transaction.description
        });
        setTransactionType(transaction.type);
      } else {
        form.reset({
          date: new Date().toISOString().split("T")[0],
          amount: "",
          type: "debit",
          category: "",
          description: ""
        });
        setTransactionType("debit");
      }
    }
  }, [transaction, form, open, transactionType]);

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

  const handleTypeChange = (type: TransactionType) => {
    setTransactionType(type);
    form.setValue("type", type);
    form.setValue("category", "");
  };

  const onSubmit = useCallback(async (values: z.infer<typeof transactionSchema>) => {
    try {
      setLoading(true);
      
      let userId: string | null = null;
      
      // Try to get user ID - first online, then from cache
      if (navigator.onLine) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (error) throw error;
          if (!user) throw new Error("No user found");
          
          userId = user.id;
          cacheUserId(userId); // Cache for offline use
        } catch (authError) {
          console.error("Online auth failed:", authError);
          // Fallback to cached user ID
          userId = getCachedUserId();
          if (!userId) {
            throw new Error("Authentication failed and no cached user ID available");
          }
        }
      } else {
        // We're offline, use cached user ID
        userId = getCachedUserId();
        if (!userId) {
          throw new Error("No cached user ID available for offline use");
        }
      }
      
      const transactionData = {
        date: values.date,
        amount: parseFloat(values.amount),
        type: values.type as TransactionType,
        category: values.category,
        description: values.description,
        user_id: userId
      };

      console.log("Saving transaction:", transactionData);

      if (navigator.onLine) {
        if (transaction) {
          // Update existing transaction
          const { error } = await supabase
            .from('transactions')
            .update(transactionData)
            .eq('id', transaction.id);
            
          if (error) {
            console.error("Update error:", error);
            throw error;
          }
          
          toast({
            title: "Success",
            description: "Transaction updated successfully"
          });
        } else {
          // Insert new transaction online
          const { error } = await supabase
            .from('transactions')
            .insert([transactionData]);
            
          if (error) {
            console.error("Insert error:", error);
            throw error;
          }
          
          toast({
            title: "Success",
            description: "Transaction added successfully"
          });
        }
      } else {
        // We're offline
        if (transaction) {
          // For now we don't support updating existing transactions offline
          toast({
            title: "Error",
            description: "Cannot update transactions while offline",
            variant: "destructive"
          });
          return;
        }
        
        // Add to enhanced local storage and sync queue
        try {
          const tempId = await addTransactionEnhanced(transactionData);
          
          toast({
            title: "Transaction Saved Offline",
            description: "This will be synced when you're back online"
          });
          
          console.log("Transaction saved offline with ID:", tempId);
        } catch (err) {
          console.error("Error saving offline:", err);
          throw new Error("Failed to save transaction offline");
        }
      }

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
            <DialogTitle className="text-lg">{transaction ? 'Edit' : 'Add'} Transaction</DialogTitle>
            <DialogDescription className="text-sm">
              Enter the details of your transaction below.
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
                      onValueChange={(value: TransactionType) => handleTypeChange(value)}
                      value={field.value}
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
                        <ScrollArea className="h-[200px]">
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </ScrollArea>
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

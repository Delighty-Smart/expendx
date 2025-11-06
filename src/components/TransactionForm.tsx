
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionIntegration } from "@/hooks/useSubscriptionIntegration";
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
import { useSmartCategorization } from "@/hooks/useSmartCategorization";
import { RecurringTemplateSelector } from "./RecurringTemplateSelector";
import { ReceiptScanner } from "./ReceiptScanner";
import { Badge } from "@/components/ui/badge";

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
  const [selectedSubscription, setSelectedSubscription] = useState<string>("");
  const { subscriptionOptions, updateSubscriptionStatus } = useSubscriptionIntegration();
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

  // Smart categorization - watch description after form is created
  const description = form.watch("description") || "";
  const { suggestions } = useSmartCategorization(description, transactionType);

  const handleReceiptData = useCallback((data: {
    amount: number;
    date?: string;
    description: string;
    category?: string;
  }) => {
    form.setValue('amount', data.amount.toString());
    form.setValue('description', data.description);
    if (data.date) {
      form.setValue('date', data.date);
    }
    if (data.category) {
      form.setValue('category', data.category);
    }
  }, [form]);

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

      // If this is a subscription transaction, update the subscription status
      if (selectedSubscription && values.category === 'Subscriptions') {
        await updateSubscriptionStatus(selectedSubscription, transactionData.amount);
      }

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
        className={`${isMobile ? 'w-[95%] max-w-[400px]' : 'sm:max-w-[500px]'} mx-auto overflow-hidden max-h-[90vh]`}
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
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-semibold">{transaction ? 'Edit' : 'Add'} Transaction</DialogTitle>
              <PendingSyncIndicator status={syncStatus} />
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              Enter the details of your transaction below.
              {!navigator.onLine && (
                <span className="block text-orange-600 dark:text-orange-400 mt-2 font-medium px-3 py-2 bg-orange-50 dark:bg-orange-950/50 rounded-lg border border-orange-200 dark:border-orange-800">
                  You're offline - changes will sync when connection is restored.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <ReceiptScanner onDataExtracted={handleReceiptData} />
              
              <div className="grid grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-10 rounded-lg border-border/50 focus:border-primary transition-colors" disabled={loading} />
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
                      <FormLabel className="text-sm font-medium text-foreground">Amount</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" step="0.01" {...field} className="h-10 rounded-lg border-border/50 focus:border-primary transition-colors" disabled={loading} />
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
                    <FormLabel className="text-sm font-medium text-foreground">Type</FormLabel>
                    <Select
                      onValueChange={handleTypeChange}
                      value={transactionType}
                      disabled={loading}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-lg border-border/50 focus:border-primary transition-colors">
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
                    <FormLabel className="text-sm font-medium text-foreground">Category</FormLabel>
                    {suggestions.length > 0 && !field.value && (
                      <div className="flex gap-2 mb-2 flex-wrap">
                        {suggestions.map((suggestion) => (
                          <Badge
                            key={suggestion.category}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/10"
                            onClick={() => field.onChange(suggestion.category)}
                          >
                            ✨ {suggestion.category} ({Math.round(suggestion.confidence * 100)}%)
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loading || categories.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-lg border-border/50 focus:border-primary transition-colors">
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

              {/* Recurring Template Selector */}
              <RecurringTemplateSelector
                transactionType={transactionType}
                disabled={loading}
                onSelect={(template) => {
                  if (template) {
                    form.setValue('amount', template.amount.toString());
                    form.setValue('category', template.category);
                    form.setValue('description', template.description);
                  }
                }}
              />

              {/* Subscription Selection - only show when Subscriptions category is selected */}
              {form.watch('category') === 'Subscriptions' && subscriptionOptions.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-foreground">Select Subscription</Label>
                  <Select
                    value={selectedSubscription}
                    onValueChange={setSelectedSubscription}
                    disabled={loading}
                  >
                    <SelectTrigger className="h-10 rounded-lg border-border/50 focus:border-primary transition-colors mt-2">
                      <SelectValue placeholder="Choose a subscription" />
                    </SelectTrigger>
                    <SelectContent>
                      {subscriptionOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter transaction details..." 
                        {...field} 
                        className="resize-none text-sm rounded-lg border-border/50 focus:border-primary transition-colors min-h-[80px]"
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
                  className="mobile-button rounded-lg border-border/50 hover:bg-muted/50 transition-colors touch-manipulation"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="mobile-button rounded-lg transition-all hover:scale-105 touch-manipulation"
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

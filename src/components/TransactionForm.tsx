
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionIntegration } from "@/hooks/useSubscriptionIntegration";
import { useCategories } from "@/hooks/useCategories";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Transaction, TransactionType, getCategoriesForType } from "@/types/transactions";
import { SERVICE_PROVIDERS, CARD_TYPES, SUBSCRIPTION_TYPES } from "@/types/subscriptions";
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
import { ChevronDown, ChevronUp } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

const transactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["credit", "debit", "savings", "subscription"] as const),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  fulfillment_rating: z.string().optional(),

  // Optional unit pricing
  unit_price: z.string().optional(),
  quantity: z.string().optional(),

  // Subscription specific fields (optional)
  service_provider: z.string().optional(),
  custom_provider: z.string().optional(),
  card_type: z.string().optional(),
  last_four_digits: z.string().optional(),
  subscription_type: z.enum(['monthly', 'annual']).optional(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unit_price: z.number().optional(),
    amount: z.number()
  })).optional(),
}).refine(data => {
  if (data.type === 'subscription' || data.category === 'Subscriptions') {
    if (data.service_provider && data.service_provider === 'Other' && !data.custom_provider) return false;
    if (data.last_four_digits && (!/^\d{4}$/.test(data.last_four_digits))) return false;
  }
  return true;
}, {
  message: "Please enter valid subscription details (last 4 digits must be 4 numbers)",
  path: ["last_four_digits"]
});

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionAdded?: () => void;
  transaction?: Transaction | null;
  sharedFileUri?: string | null;
  sharedMimeType?: string | null;
}

export const TransactionForm = ({
  open,
  onOpenChange,
  onTransactionAdded,
  transaction,
  sharedFileUri,
  sharedMimeType
}: TransactionFormProps) => {
  const { toast } = useToast();
  const { currency, trueHourlyRate } = useSettings();
  const [transactionType, setTransactionType] = useState<TransactionType>(transaction?.type || "debit");
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<string>("");
  const [showUnitPricing, setShowUnitPricing] = useState(false);
  const [extraSuggestions, setExtraSuggestions] = useState<string[]>([]);
  const { subscriptionOptions, upsertSubscriptionFromTransaction } = useSubscriptionIntegration();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { getTransactionSyncStatus } = useEnhancedOfflineSync();
  const { categories: customProviders } = useCategories('subscription');

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: transaction?.date || new Date().toISOString().split("T")[0],
      amount: transaction?.amount.toString() || "",
      type: transaction?.type || "debit",
      category: transaction?.category || "",
      description: transaction?.description || "",
      unit_price: "",
      quantity: "",
      service_provider: "",
      custom_provider: "",
      card_type: "",
      last_four_digits: "",
      subscription_type: "monthly",
      fulfillment_rating: ""
    }
  });

  // Smart categorization - watch description after form is created
  const description = form.watch("description") || "";
  const { suggestions } = useSmartCategorization(description, transactionType);



  const watchedAmount = form.watch("amount");
  const lifeHoursCost = useMemo(() => {
    const amt = parseFloat(watchedAmount || "");
    if (isNaN(amt) || amt <= 0) return 0;
    return amt / trueHourlyRate;
  }, [watchedAmount, trueHourlyRate]);

  // Auto-calculate amount from unit_price × quantity (single item)
  const watchedUnitPrice = form.watch("unit_price");
  const watchedQuantity = form.watch("quantity");
  useEffect(() => {
    const up = parseFloat(watchedUnitPrice || "");
    const qty = parseFloat(watchedQuantity || "");
    if (!isNaN(up) && !isNaN(qty) && up > 0 && qty > 0) {
      form.setValue("amount", (up * qty).toFixed(2));
    }
  }, [watchedUnitPrice, watchedQuantity, form]);

  // Auto-calculate amount from itemized list
  const watchedItems = form.watch("items");
  useEffect(() => {
    if (watchedItems && watchedItems.length > 0) {
      const total = watchedItems.reduce((acc, item) => acc + (item.amount || 0), 0);
      if (total > 0) {
        form.setValue("amount", total.toFixed(2));
      }
    }
  }, [watchedItems, form]);

  const handleReceiptData = useCallback((data: {
    amount: number;
    date?: string;
    merchant: string;
    summary: string;
    category?: string;
    category_suggestions?: string[];
    items?: {
      name: string;
      quantity: number;
      unit_price?: number;
      amount: number;
    }[];
  }) => {
    form.setValue('amount', data.amount.toString());
    form.setValue('description', data.summary || data.merchant);

    if (data.date) {
      form.setValue('date', data.date);
    }

    if (data.category) {
      form.setValue('category', data.category);
    }

    if (data.category_suggestions) {
      setExtraSuggestions(data.category_suggestions);
    } else {
      setExtraSuggestions([]);
    }

    if (data.items) {
      form.setValue('items', data.items);
      if (data.items.length > 1) {
        setShowUnitPricing(false); // Hide single unit pricing if we have many items
      }
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
        const ratingMatch = transaction.description.match(/\[Fulfillment:\s*([1-5])\]/);
        const rating = ratingMatch ? ratingMatch[1] : "";
        const cleanDesc = transaction.description.replace(/\[Fulfillment:\s*[1-5]\]/g, "").trim();

        form.reset({
          date: transaction.date,
          amount: transaction.amount.toString(),
          type: transaction.type,
          category: transaction.category,
          description: cleanDesc,
          unit_price: "",
          quantity: "",
          service_provider: "",
          custom_provider: "",
          card_type: "",
          last_four_digits: "",
          subscription_type: "monthly",
          fulfillment_rating: rating,
        });
        setTransactionType(transaction.type);
        loadCategories(transaction.type);
      } else {
        form.reset({
          date: new Date().toISOString().split("T")[0],
          amount: "",
          type: "debit",
          category: "",
          description: "",
          unit_price: "",
          quantity: "",
          service_provider: "",
          custom_provider: "",
          card_type: "",
          last_four_digits: "",
          subscription_type: "monthly",
          fulfillment_rating: "",
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

      let finalDescription = values.description;
      if (values.fulfillment_rating) {
        finalDescription = finalDescription.replace(/\[Fulfillment:\s*[1-5]\]/g, "").trim();
        finalDescription = `${finalDescription}\n\n[Fulfillment: ${values.fulfillment_rating}]`;
      }

      const transactionData: {
        date: string;
        amount: number;
        type: TransactionType;
        category: string;
        description: string;
        user_id: string;
        unit_price: number | null;
        quantity: number | null;
      } = {
        date: values.date,
        amount: parseFloat(values.amount),
        type: values.type as TransactionType,
        category: values.category,
        description: finalDescription,
        user_id: userId,
        unit_price: values.unit_price ? parseFloat(values.unit_price) : null,
        quantity: values.quantity ? parseFloat(values.quantity) : null,
      };

      // If we have items from receipt, format them into description nicely
      if (values.items && values.items.length > 0) {
        const itemsList = values.items
          .map(item => `- ${item.name}: ${item.quantity}x @ ${item.unit_price || (item.amount / item.quantity).toFixed(2)} = ${item.amount}`)
          .join('\n');
        transactionData.description = `${values.description}\n\nItemized Breakdown:\n${itemsList}`;
      }

      console.log("Saving transaction with enhanced offline support:", transactionData);

      // If this is a subscription transaction, update or link the subscription
      if ((values.type === 'subscription' || values.category === 'Subscriptions') && (values.service_provider || values.description)) {
        const provider = values.service_provider 
          ? (values.service_provider === 'Other' ? (values.custom_provider || values.description) : values.service_provider)
          : values.description;
        
        const cardType = values.card_type || 'Mastercard';
        const lastFour = values.last_four_digits || '0000';
        const subType = values.subscription_type || 'monthly';

        await upsertSubscriptionFromTransaction({
          subscriptionId: selectedSubscription || undefined,
          amount: parseFloat(values.amount),
          service_provider: provider,
          card_type: cardType,
          last_four_digits: lastFour,
          subscription_type: subType
        }).catch(err => console.warn("Failed to sync subscription record automatically:", err));
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
      const errMsg = error?.message || error?.error_description || (typeof error === 'string' ? error : "An unexpected error occurred");
      toast({
        title: "Error",
        description: errMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast, transaction, onOpenChange, onTransactionAdded, queryClient, selectedSubscription, upsertSubscriptionFromTransaction]);

  const syncStatus = transaction ? getTransactionSyncStatus(transaction.id) : 'synced';

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-sm mx-auto">
        {/* Amount Area */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="space-y-1 text-center py-2 bg-transparent border-none shadow-none">
              <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/45">Amount</FormLabel>
              <FormControl>
                <div className="relative flex items-center justify-center h-12">
                  <span className="text-2xl font-medium text-muted-foreground/50 mr-1.5 select-none font-numeric">
                    {currency?.symbol || "$"}
                  </span>
                  <input
                    type="number"
                    placeholder="0"
                    step="0.01"
                    {...field}
                    disabled={loading}
                    className="bg-transparent border-none text-center text-4xl font-bold tracking-tight focus:outline-none focus:ring-0 min-w-[120px] text-foreground placeholder:text-muted-foreground/20 font-numeric"
                  />
                </div>
              </FormControl>
              {lifeHoursCost > 0 && (
                <p className="text-[10px] text-muted-foreground font-semibold">
                  ⌛ {lifeHoursCost.toFixed(1)} hours of life energy
                </p>
              )}
              <FormMessage className="text-center text-xs" />
            </FormItem>
          )}
        />

        {/* Info Grid - Type, Date, Category */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Type selector */}
            <FormField
              control={form.control}
              name="type"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-semibold text-muted-foreground/60 uppercase">Type</FormLabel>
                  <Select
                    onValueChange={(val) => handleTypeChange(val as TransactionType)}
                    value={field.value}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger className={cn(
                        "h-10 bg-muted/30 border rounded-xl text-xs font-semibold px-3 focus:ring-0 transition-colors",
                        fieldState.error ? "border-destructive text-destructive bg-destructive/5" : "border-border-default"
                      )}>
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="credit" className="text-xs">Income (In)</SelectItem>
                      <SelectItem value="debit" className="text-xs">Expense (Out)</SelectItem>
                      <SelectItem value="savings" className="text-xs">Savings (Save)</SelectItem>
                      <SelectItem value="subscription" className="text-xs">Subscription (Sub)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category dropdown */}
            <FormField
              control={form.control}
              name="category"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-semibold text-muted-foreground/60 uppercase">Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loading || categories.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className={cn(
                        "h-10 bg-muted/30 border rounded-xl text-xs font-semibold px-3 focus:ring-0 transition-colors",
                        fieldState.error ? "border-destructive text-destructive bg-destructive/5" : "border-border-default"
                      )}>
                        <SelectValue placeholder={categories.length === 0 ? "Loading..." : "Select"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category} className="text-xs">
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="date"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-[10px] font-semibold text-muted-foreground/60 uppercase">Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field} 
                    className={cn(
                      "h-10 bg-muted/30 border rounded-xl text-xs font-medium px-3 transition-colors",
                      fieldState.error ? "border-destructive text-destructive bg-destructive/5" : "border-border-default"
                    )} 
                    disabled={loading} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description area */}
          <FormField
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-[10px] font-semibold text-muted-foreground/60 uppercase">Notes</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Specify merchant details or notes..."
                    {...field}
                    className={cn(
                      "h-10 bg-muted/30 border rounded-xl text-xs font-medium px-3 transition-colors",
                      fieldState.error ? "border-destructive text-destructive bg-destructive/5 placeholder:text-destructive/50" : "border-border-default"
                    )}
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fulfillment Rating section */}
          {transactionType !== "credit" && (
            <FormField
              control={form.control}
              name="fulfillment_rating"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[10px] font-semibold text-muted-foreground/60 uppercase">Fulfillment</FormLabel>
                  <FormControl>
                    <div className="flex items-center justify-around bg-muted/30 p-2 rounded-2xl border border-border-default">
                      {[
                        { rating: "1", emoji: "💔", label: "Waste" },
                        { rating: "2", emoji: "😐", label: "Neutral" },
                        { rating: "3", emoji: "😊", label: "Good" },
                        { rating: "4", emoji: "💖", label: "Joy" },
                        { rating: "5", emoji: "🌟", label: "Fulfill" }
                      ].map((item) => {
                        const isActive = field.value === item.rating;
                        return (
                          <button
                            key={item.rating}
                            type="button"
                            onClick={() => field.onChange(item.rating)}
                            className={cn(
                              "flex flex-col items-center gap-0.5 p-1 px-3 rounded-xl transition-all duration-150 active:scale-95",
                              isActive ? "bg-white dark:bg-card text-foreground shadow-sm scale-105" : "opacity-40"
                            )}
                          >
                            <span className="text-sm">{item.emoji}</span>
                            <span className="text-[8px] font-bold">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              form.reset();
              onOpenChange(false);
            }}
            className="h-10 rounded-xl px-4 text-xs font-semibold text-muted-foreground hover:bg-transparent"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="h-10 rounded-xl px-6 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 transition-all shadow-md"
            disabled={loading}
          >
            {loading ? "Saving..." : transaction ? 'Update' : 'Confirm'}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="w-full bg-background px-1 select-none flex justify-center">
      <div className="w-full max-w-sm p-6 bg-card rounded-[32px]">
        {formContent}
      </div>
    </div>
  );
};

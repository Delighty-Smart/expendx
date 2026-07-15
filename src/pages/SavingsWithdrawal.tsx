
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { savingsCategories } from "@/types/transactions";
import { useSettings } from "@/contexts/SettingsContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowDownToLine } from "lucide-react";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useEnhancedTransactionData } from "@/hooks/useEnhancedTransactionData";

const withdrawalSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().min(1, "Description is required")
});

const SavingsWithdrawalPage = () => {
  const { toast } = useToast();
  const { currency } = useSettings();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addTransactionOffline } = useEnhancedTransactionData();

  const form = useForm<z.infer<typeof withdrawalSchema>>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      category: "",
      amount: "",
      description: "Withdrawal from savings"
    }
  });

  const { data: transactionsData } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "savings");

      if (error) throw error;
      return data || [];
    },
  });

  const calculateSavingsByCategory = (category: string) => {
    if (!transactionsData) return 0;

    return transactionsData
      .filter((t) => t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const onSubmit = async (values: z.infer<typeof withdrawalSchema>) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const withdrawalAmount = parseFloat(values.amount);
      const availableSavings = calculateSavingsByCategory(values.category);

      if (withdrawalAmount > availableSavings) {
        toast({
          title: "Insufficient funds",
          description: `You only have ${currency.symbol}${availableSavings.toFixed(2)} in this category`,
          variant: "destructive"
        });
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Create withdrawal transaction (negative savings entry) using enhanced offline
      await addTransactionOffline({
        date: today,
        amount: -withdrawalAmount, // Negative to reduce savings
        type: "savings",
        category: values.category,
        description: `Withdrawal: ${values.description}`,
        user_id: user.id
      });

      // Add to wallet balance (credit entry) using enhanced offline
      await addTransactionOffline({
        date: today,
        amount: withdrawalAmount,
        type: "credit",
        category: "Withdrawal from Savings",
        description: `From ${values.category}: ${values.description}`,
        user_id: user.id
      });

      const isOffline = !navigator.onLine;
      toast({
        title: "Success",
        description: isOffline
          ? `${currency.symbol}${withdrawalAmount.toFixed(2)} withdrawal saved offline and will sync when online`
          : `${currency.symbol}${withdrawalAmount.toFixed(2)} withdrawn successfully`
      });

      // Refresh data and navigate back
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["enhanced_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["savings_goals"] });
      navigate("/savings");
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

  const categoryField = form.watch("category");
  const availableSavings = categoryField ? calculateSavingsByCategory(categoryField) : 0;

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="mr-2"
            onClick={() => navigate("/savings")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Withdraw from Savings</h1>
        </div>
        <OfflineIndicator />
      </div>

      {!navigator.onLine && (
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="text-sm text-orange-700 dark:text-orange-300">
            You're offline. Your withdrawal will be saved locally and synced when connection is restored.
          </p>
        </div>
      )}

      <Card className="p-6">
        <div className="flex justify-center mb-6">
          <div className="p-3 rounded-full bg-primary/20">
            <ArrowDownToLine className="h-12 w-12 text-primary" />
          </div>
        </div>

        <p className="text-center mb-6 text-muted-foreground">
          Transfer funds from your savings to your wallet balance.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Savings Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {savingsCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categoryField && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: {currency.symbol}{availableSavings.toFixed(2)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ({currency.symbol})</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" max={availableSavings.toString()} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => navigate("/savings")}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !categoryField || availableSavings <= 0}>
                {loading ? "Processing..." : "Withdraw"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default SavingsWithdrawalPage;

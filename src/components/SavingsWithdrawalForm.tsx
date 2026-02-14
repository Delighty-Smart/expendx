
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
import { useEffect, useState } from "react";
import { savingsCategories } from "@/types/transactions";
import { useSettings } from "@/contexts/SettingsContext";
import { useQuery } from "@tanstack/react-query";

const withdrawalSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().min(1, "Description is required")
});

interface WithdrawalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWithdrawalComplete?: () => void;
}

export function SavingsWithdrawalForm({
  open,
  onOpenChange,
  onWithdrawalComplete
}: WithdrawalFormProps) {
  const { toast } = useToast();
  const { currency } = useSettings();
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (open) {
      form.reset({
        category: "",
        amount: "",
        description: "Withdrawal from savings"
      });
    }
  }, [open, form]);

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

      // Create withdrawal transaction (negative savings entry)
      const { error: savingsError } = await supabase
        .from('transactions')
        .insert([{
          date: today,
          amount: -withdrawalAmount, // Negative to reduce savings
          type: "savings",
          category: values.category,
          description: `Withdrawal: ${values.description}`,
          user_id: user.id
        }]);

      if (savingsError) {
        console.error("Savings error:", savingsError);
        throw savingsError;
      }

      // Add to wallet balance (credit entry)
      const { error: creditError } = await supabase
        .from('transactions')
        .insert([{
          date: today,
          amount: withdrawalAmount,
          type: "credit",
          category: "Withdrawal from Savings",
          description: `From ${values.category}: ${values.description}`,
          user_id: user.id
        }]);

      if (creditError) {
        console.error("Credit error:", creditError);
        throw creditError;
      }

      toast({
        title: "Success",
        description: `${currency.symbol}${withdrawalAmount.toFixed(2)} withdrawn successfully`
      });

      onOpenChange(false);

      if (onWithdrawalComplete) {
        onWithdrawalComplete();
      }
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
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        form.reset();
      }
      onOpenChange(open);
    }}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-[425px] overflow-y-auto max-h-[90vh] p-4 sm:p-6">

        <DialogHeader>
          <DialogTitle>Withdraw from Savings</DialogTitle>
          <DialogDescription>
            Transfer funds from your savings to your wallet balance.
          </DialogDescription>
        </DialogHeader>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !categoryField || availableSavings <= 0}>
                {loading ? "Processing..." : "Withdraw"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PiggyBank } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

const savingsSchema = z.object({
  savingsGoal: z.string().min(1, "Savings goal is required"),
});

const SetSavingsGoalPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const { currency } = useSettings();

  const { data: budgetCategories } = useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_categories")
        .select("*")
        .order("category");
      if (error) throw error;
      return data || [];
    },
  });

  const savingsCategory = budgetCategories?.find(b => b.category === "Savings");

  const form = useForm<z.infer<typeof savingsSchema>>({
    resolver: zodResolver(savingsSchema),
    defaultValues: {
      savingsGoal: "",
    },
  });

  // Update form when savings data is loaded
  useEffect(() => {
    if (savingsCategory?.monthly_limit) {
      form.reset({
        savingsGoal: savingsCategory.monthly_limit.toString(),
      });
    }
  }, [savingsCategory, form]);

  const onSubmit = useCallback(async (values: z.infer<typeof savingsSchema>) => {
    try {
      setLoading(true);
      const goalAmount = parseFloat(values.savingsGoal);

      if (isNaN(goalAmount) || goalAmount <= 0) {
        throw new Error("Please enter a valid savings goal");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      if (savingsCategory) {
        await supabase
          .from("budget_categories")
          .update({ monthly_limit: goalAmount })
          .eq("id", savingsCategory.id);
      } else {
        await supabase
          .from("budget_categories")
          .insert({
            category: "Savings",
            monthly_limit: goalAmount,
            user_id: user.id
          });
      }

      toast({
        title: "Success",
        description: "Savings goal updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      navigate("/budgets");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, navigate, queryClient, savingsCategory]);

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          className="mr-2"
          onClick={() => navigate("/budgets")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Set Savings Goal</h1>
      </div>

      <Card className="p-6">
        <div className="flex justify-center mb-6">
          <div className="p-3 rounded-full bg-green-500/20">
            <PiggyBank className="h-12 w-12 text-green-500" />
          </div>
        </div>

        <p className="text-center mb-6 text-muted-foreground">
          Set your monthly savings target. This will help track your progress.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="savingsGoal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Savings Goal</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {currency.symbol}
                      </span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        className="pl-8"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/budgets")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Goal"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default SetSavingsGoalPage;

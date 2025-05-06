
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { ArrowLeft, DollarSign } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

const incomeSchema = z.object({
  amount: z.string().min(1, "Monthly income is required"),
});

const SetIncomePage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const { currency } = useSettings();

  const { data: monthlyIncome } = useQuery({
    queryKey: ["monthly_income"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_income_estimates")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<z.infer<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      amount: "",
    },
  });

  // Update form when monthly income data is loaded
  useEffect(() => {
    if (monthlyIncome?.amount) {
      form.reset({
        amount: monthlyIncome.amount.toString(),
      });
    }
  }, [monthlyIncome, form]);

  const onSubmit = useCallback(async (values: z.infer<typeof incomeSchema>) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const incomeData = {
        amount: parseFloat(values.amount),
        user_id: user.id,
      };

      if (monthlyIncome) {
        // Update existing income
        const { error } = await supabase
          .from("monthly_income_estimates")
          .update(incomeData)
          .eq("id", monthlyIncome.id);

        if (error) throw error;
      } else {
        // Insert new income
        const { error } = await supabase
          .from("monthly_income_estimates")
          .insert([incomeData]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Monthly income updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
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
  }, [toast, navigate, queryClient, monthlyIncome]);

  return (
    <Layout>
      <div className="container mx-auto p-4 max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-2" 
            onClick={() => navigate("/budgets")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Set Monthly Income</h1>
        </div>
        
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Income</FormLabel>
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
                  {loading ? "Saving..." : "Save Income"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
};

export default SetIncomePage;

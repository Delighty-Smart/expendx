
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { expenseCategories } from "@/types/transactions";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { ArrowLeft } from "lucide-react";

const budgetSchema = z.object({
  category: z.enum([...expenseCategories] as const),
  monthlyLimit: z.string().min(1, "Monthly limit is required"),
});

const AddBudgetPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof budgetSchema>>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: expenseCategories[0],
      monthlyLimit: "",
    },
  });

  const onSubmit = useCallback(async (values: z.infer<typeof budgetSchema>) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const budgetData = {
        category: values.category,
        monthly_limit: parseFloat(values.monthlyLimit),
        user_id: user.id,
      };

      const { error } = await supabase
        .from("budget_categories")
        .insert([budgetData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Budget limit added successfully",
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
  }, [toast, navigate, queryClient]);

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
          <h1 className="text-2xl font-bold">Set Budget Limit</h1>
        </div>
        
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[250px] overflow-y-auto">
                        {expenseCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthlyLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        {...field}
                      />
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
                  {loading ? "Saving..." : "Save Budget"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
};

export default AddBudgetPage;

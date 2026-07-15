
import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getCategoriesForType } from "@/types/transactions";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

const budgetSchema = z.object({
  category: z.string().min(1, "Category is required"),
  monthlyLimit: z.string().min(1, "Monthly limit is required"),
});

const EditBudgetPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Get budget from location state
  useEffect(() => {
    if (location.state?.budget) {
      setBudget(location.state.budget);
    } else {
      navigate("/budgets");
    }
  }, [location.state, navigate]);

  // Load expense categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const fetchedCategories = await getCategoriesForType("debit");
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Error loading expense categories:", error);
      }
    };

    loadCategories();
  }, []);

  const form = useForm<z.infer<typeof budgetSchema>>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: budget?.category || "",
      monthlyLimit: budget?.monthly_limit?.toString() || "",
    },
  });

  // Update form values when budget is set
  useEffect(() => {
    if (budget) {
      form.reset({
        category: budget.category,
        monthlyLimit: budget.monthly_limit.toString(),
      });
    }
  }, [budget, form]);

  const onSubmit = useCallback(async (values: z.infer<typeof budgetSchema>) => {
    if (!budget) return;

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
        .update(budgetData)
        .eq("id", budget.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Budget limit updated successfully",
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
  }, [toast, budget, navigate, queryClient]);

  if (!budget) {
    return (
      <div className="space-y-6">
        <p>Loading...</p>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold">Edit Budget Limit</h1>
      </div>

      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[250px] overflow-y-auto">
                      {categories.map((category) => (
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
                {loading ? "Saving..." : "Update Budget"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default EditBudgetPage;

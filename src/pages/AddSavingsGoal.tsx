
import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getCategoriesForType, SavingsGoal } from "@/types/transactions";
import { useSettings } from "@/contexts/SettingsContext";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PiggyBank } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, GlassCard } from "@/components/ui/card";

const savingsGoalSchema = z.object({
  category: z.string().min(1, "Category is required"),
  target_amount: z.string().min(1, "Target amount is required"),
});

const AddSavingsGoalPage = () => {
  const { toast } = useToast();
  const { currency } = useSettings();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Check if we're editing an existing goal
  const savingsGoalToEdit = location.state?.savingsGoal;
  const isEditing = !!savingsGoalToEdit;

  const form = useForm<z.infer<typeof savingsGoalSchema>>({
    resolver: zodResolver(savingsGoalSchema),
    defaultValues: {
      category: "",
      target_amount: "",
    }
  });

  useEffect(() => {
    if (savingsGoalToEdit) {
      form.reset({
        category: savingsGoalToEdit.category,
        target_amount: savingsGoalToEdit.target_amount.toString(),
      });
    }
  }, [savingsGoalToEdit, form]);

  // Fetch savings categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const fetchedCategories = await getCategoriesForType("savings");
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Error loading savings categories:", error);
      }
    };

    loadCategories();
  }, []);

  const onSubmit = async (values: z.infer<typeof savingsGoalSchema>) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const savingsGoalData = {
        category: values.category,
        target_amount: parseFloat(values.target_amount),
        user_id: user.id
      };

      if (isEditing) {
        // Update existing savings goal
        const { error } = await supabase
          .from("savings_goals" as any)
          .update(savingsGoalData)
          .eq('id', savingsGoalToEdit.id);

        if (error) {
          console.error("Update error:", error);
          throw error;
        }

        toast({
          title: "Success",
          description: "Savings goal updated successfully"
        });
      } else {
        // Check if a goal for this category already exists
        const { data: existingGoal, error: checkError } = await supabase
          .from("savings_goals" as any)
          .select('*')
          .eq('category', values.category)
          .eq('user_id', user.id)
          .maybeSingle();

        if (checkError) {
          console.error("Check error:", checkError);
          throw checkError;
        }

        // Fix: Check if existingGoal exists and has an id property before accessing it
        if (existingGoal && 'id' in existingGoal) {
          // Update the existing goal instead of creating a new one
          const { error } = await supabase
            .from("savings_goals" as any)
            .update({
              target_amount: parseFloat(values.target_amount)
            })
            .eq('id', existingGoal.id);

          if (error) {
            console.error("Update error:", error);
            throw error;
          }

          toast({
            title: "Success",
            description: "Savings goal updated successfully"
          });
        } else {
          // Insert new savings goal
          const { error } = await supabase
            .from("savings_goals" as any)
            .insert([savingsGoalData]);

          if (error) {
            console.error("Insert error:", error);
            throw error;
          }

          toast({
            title: "Success",
            description: "Savings goal added successfully"
          });
        }
      }

      // Refresh data and navigate back
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

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          className="mr-2"
          onClick={() => navigate("/savings")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-bold">{isEditing ? 'Edit' : 'Add'} Savings Goal</h1>
      </div>

      <Card className="p-6">
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-primary-subtle flex items-center justify-center">
            <PiggyBank className="h-8 w-8 text-text-primary" />
          </div>
        </div>

        <p className="text-center mb-5 text-sm text-muted-foreground">
          Set a target amount for your savings category.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEditing || loading || categories.length === 0}
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
              name="target_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Target Amount ({currency.symbol})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      className="h-9"
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/savings")}
                className="h-9 text-sm"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-9 text-sm"
              >
                {loading ? "Saving..." : isEditing ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default AddSavingsGoalPage;

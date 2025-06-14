
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form, Form Control, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Layout from "@/components/Layout";
import { ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCategories } from "@/hooks/useCategories";
import { Card } from "@/components/ui/card";
import { useEnhancedBudgetData } from "@/hooks/useEnhancedBudgetData";
import { OfflineIndicator } from "@/components/OfflineIndicator";

const budgetSchema = z.object({
  category: z.string().min(1, "Category is required"),
  monthlyLimit: z.string().min(1, "Monthly limit is required"),
});

const AddBudgetPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { categories, loading: categoriesLoading } = useCategories("debit");
  const { addBudgetOffline } = useEnhancedBudgetData();

  const form = useForm<z.infer<typeof budgetSchema>>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: "",
      monthlyLimit: "",
    },
  });

  const onSubmit = useCallback(async (values: z.infer<typeof budgetSchema>) => {
    try {
      setLoading(true);
      
      const budgetData = {
        category: values.category,
        monthly_limit: parseFloat(values.monthlyLimit),
      };

      await addBudgetOffline(budgetData);
      navigate("/budgets");
    } catch (error: any) {
      // Error handling is done in the hook
    } finally {
      setLoading(false);
    }
  }, [addBudgetOffline, navigate]);

  return (
    <Layout>
      <div className="animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              className="mr-2 h-8 px-2" 
              onClick={() => navigate("/budgets")}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <h1 className="text-xl font-medium">Set Budget Limit</h1>
          </div>
          <OfflineIndicator />
        </div>
        
        {!navigator.onLine && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              You're offline. Your budget will be saved locally and synced when connection is restored.
            </p>
          </div>
        )}
        
        <Card className="max-w-md mx-auto">
          <div className="p-4 md:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={loading || categoriesLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <ScrollArea className="h-[180px]">
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </ScrollArea>
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
                          className="h-9"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/budgets")}
                    size="sm"
                    className="h-9"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    size="sm"
                    className="h-9"
                  >
                    {loading ? "Saving..." : "Save Budget"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default AddBudgetPage;

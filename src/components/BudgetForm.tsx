
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getCategoriesForType } from "@/types/transactions";
import { ScrollArea } from "@/components/ui/scroll-area";

const budgetSchema = z.object({
  category: z.string().min(1, "Category is required"),
  monthlyLimit: z.string().min(1, "Monthly limit is required"),
});

interface BudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBudgetAdded?: () => void;
  initialCategory?: string;
  budgetId?: string;
}

export function BudgetForm({
  open,
  onOpenChange,
  onBudgetAdded,
  initialCategory,
  budgetId,
}: BudgetFormProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof budgetSchema>>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: initialCategory || "",
      monthlyLimit: "",
    },
  });

  // Fetch expense categories when component mounts or opens
  useEffect(() => {
    if (open) {
      const loadCategories = async () => {
        try {
          const fetchedCategories = await getCategoriesForType("debit");
          setCategories(fetchedCategories);

          if (initialCategory) {
            form.setValue("category", initialCategory);
          }
        } catch (error) {
          console.error("Error loading expense categories:", error);
        }
      };

      loadCategories();
    }
  }, [open, form, initialCategory]);

  async function onSubmit(values: z.infer<typeof budgetSchema>) {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const budgetData = {
        category: values.category,
        monthly_limit: parseFloat(values.monthlyLimit),
        user_id: user.id,
      };

      // Handling both insert and update cases
      if (budgetId) {
        // Update existing budget
        const { error } = await supabase
          .from("budget_categories")
          .update(budgetData)
          .eq("id", budgetId);

        if (error) throw error;
      } else {
        // Insert new budget
        const { error } = await supabase
          .from("budget_categories")
          .insert([budgetData]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Budget limit updated successfully",
      });

      onBudgetAdded?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">

        <DialogHeader>
          <DialogTitle>Set Budget Limit</DialogTitle>
          <DialogDescription>
            Set a monthly spending limit for a category.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!initialCategory || loading || categories.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 bg-muted/30 border-none rounded-xl font-medium">
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
                      className="h-11 bg-muted/30 border-none rounded-xl font-bold"
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                className="h-12 rounded-xl px-6 font-bold text-muted-foreground hover:text-foreground"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-12 rounded-xl px-8 font-bold bg-foreground text-background hover:scale-105 active:scale-95 transition-all"
                disabled={loading}
              >
                {loading ? "Saving..." : budgetId ? "Update" : "Save"} Budget
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default BudgetForm;

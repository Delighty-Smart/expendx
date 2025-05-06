
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
import { expenseCategories } from "@/types/transactions";

const budgetSchema = z.object({
  category: z.enum([...expenseCategories] as const),
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
  const form = useForm<z.infer<typeof budgetSchema>>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: (initialCategory as any) || expenseCategories[0],
      monthlyLimit: "",
    },
  });

  async function onSubmit(values: z.infer<typeof budgetSchema>) {
    try {
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
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Budget Limit</DialogTitle>
          <DialogDescription>
            Set a monthly spending limit for a category.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <SelectContent className="scrollable-container">
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Budget</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

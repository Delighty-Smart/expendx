
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { savingsCategories } from "@/types/transactions";
import { useSettings } from "@/contexts/SettingsContext";

const savingsGoalSchema = z.object({
  category: z.string().min(1, "Category is required"),
  target_amount: z.string().min(1, "Target amount is required"),
});

interface SavingsGoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSavingsGoalAdded?: () => void;
  savingsGoalId?: string;
}

export function SavingsGoalForm({
  open,
  onOpenChange,
  onSavingsGoalAdded,
  savingsGoalId
}: SavingsGoalFormProps) {
  const { toast } = useToast();
  const { currency } = useSettings();
  const [loading, setLoading] = useState(false);
  
  const form = useForm<z.infer<typeof savingsGoalSchema>>({
    resolver: zodResolver(savingsGoalSchema),
    defaultValues: {
      category: "",
      target_amount: "",
    }
  });

  useEffect(() => {
    if (open && savingsGoalId) {
      const fetchSavingsGoal = async () => {
        const { data, error } = await supabase
          .from("savings_goals")
          .select("*")
          .eq("id", savingsGoalId)
          .single();
          
        if (error) {
          console.error("Error fetching savings goal:", error);
          return;
        }
        
        if (data) {
          form.reset({
            category: data.category,
            target_amount: data.target_amount.toString(),
          });
        }
      };
      
      fetchSavingsGoal();
    } else if (open) {
      form.reset({
        category: "",
        target_amount: "",
      });
    }
  }, [open, savingsGoalId, form]);

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

      if (savingsGoalId) {
        // Update existing savings goal
        const { error } = await supabase
          .from('savings_goals')
          .update(savingsGoalData)
          .eq('id', savingsGoalId);
          
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
          .from('savings_goals')
          .select('*')
          .eq('category', values.category)
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (checkError) {
          console.error("Check error:", checkError);
          throw checkError;
        }
        
        if (existingGoal) {
          // Update the existing goal instead of creating a new one
          const { error } = await supabase
            .from('savings_goals')
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
            .from('savings_goals')
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

      onOpenChange(false);
      
      if (onSavingsGoalAdded) {
        onSavingsGoalAdded();
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

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        form.reset();
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{savingsGoalId ? 'Edit' : 'Add'} Savings Goal</DialogTitle>
          <DialogDescription>
            Set a target amount for your savings category.
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!savingsGoalId}
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Amount ({currency.symbol})</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : savingsGoalId ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

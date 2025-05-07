
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
import { useEffect, useState } from "react";
import { savingsCategories, SavingsGoal } from "@/types/transactions";
import { useSettings } from "@/contexts/SettingsContext";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { ArrowLeft, PiggyBank } from "lucide-react";

const savingsGoalSchema = z.object({
  category: z.string().min(1, "Category is required"),
  target_amount: z.string().min(1, "Target amount is required"),
});

const AddSavingsGoalPage = () => {
  const { toast } = useToast();
  const { currency } = useSettings();
  const [loading, setLoading] = useState(false);
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
    <Layout>
      <div className="container mx-auto p-4 max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-2" 
            onClick={() => navigate("/savings")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{isEditing ? 'Edit' : 'Add'} Savings Goal</h1>
        </div>
        
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-full bg-secondary/20">
              <PiggyBank className="h-12 w-12 text-secondary" />
            </div>
          </div>
          
          <p className="text-center mb-6 text-muted-foreground">
            Set a target amount for your savings category.
          </p>
          
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
                      disabled={isEditing}
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

              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => navigate("/savings")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : isEditing ? "Update" : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
};

export default AddSavingsGoalPage;

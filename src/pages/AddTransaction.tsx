
import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Transaction, TransactionType, getCategoriesForType } from "@/types/transactions";
import { useQueryClient } from "@tanstack/react-query";
import { addTransaction, queueTransactionForSync } from "@/services/offlineStorage"; 
import Layout from "@/components/Layout";
import { ArrowLeft } from "lucide-react";

const transactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["credit", "debit", "savings"] as const),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required")
});

const AddTransactionPage = () => {
  const { toast } = useToast();
  const [transactionType, setTransactionType] = useState<TransactionType>("debit");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  
  // Get transaction from location state if we're editing
  useEffect(() => {
    if (location.state?.transaction) {
      setTransaction(location.state.transaction);
      setTransactionType(location.state.transaction.type);
    }
  }, [location.state]);
  
  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: transaction?.date || new Date().toISOString().split("T")[0],
      amount: transaction?.amount.toString() || "",
      type: transaction?.type || "debit",
      category: transaction?.category || "",
      description: transaction?.description || ""
    }
  });

  // Update form when transaction changes
  useEffect(() => {
    if (transaction) {
      form.reset({
        date: transaction.date,
        amount: transaction.amount.toString(),
        type: transaction.type,
        category: transaction.category,
        description: transaction.description
      });
      setTransactionType(transaction.type);
    }
  }, [transaction, form]);

  const handleTypeChange = (type: TransactionType) => {
    setTransactionType(type);
    form.setValue("type", type);
    form.setValue("category", "");
  };

  const onSubmit = useCallback(async (values: z.infer<typeof transactionSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      
      const transactionData = {
        date: values.date,
        amount: parseFloat(values.amount),
        type: values.type as TransactionType,
        category: values.category,
        description: values.description,
        user_id: user.id
      };

      console.log("Saving transaction:", transactionData);

      if (navigator.onLine) {
        if (transaction) {
          // Update existing transaction
          const { error } = await supabase
            .from('transactions')
            .update(transactionData)
            .eq('id', transaction.id);
            
          if (error) {
            console.error("Update error:", error);
            throw error;
          }
          
          toast({
            title: "Success",
            description: "Transaction updated successfully"
          });
        } else {
          // Insert new transaction
          const { error } = await supabase
            .from('transactions')
            .insert([transactionData]);
            
          if (error) {
            console.error("Insert error:", error);
            throw error;
          }
          
          toast({
            title: "Success",
            description: "Transaction added successfully"
          });
        }
      } else {
        // We're offline, store locally and queue for sync
        if (transaction) {
          // For now we don't support updating existing transactions offline
          toast({
            title: "Error",
            description: "Cannot update transactions while offline",
            variant: "destructive"
          });
          return;
        }
        
        // Add to local cache and queue for sync
        try {
          await addTransaction({...transactionData, id: crypto.randomUUID()});
          await queueTransactionForSync(transactionData);
          
          toast({
            title: "Transaction Saved Offline",
            description: "This will be synced when you're back online"
          });
        } catch (err) {
          console.error("Error saving offline:", err);
          throw new Error("Failed to save transaction offline");
        }
      }

      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_income"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      
      // Navigate back to transactions page
      navigate("/transactions");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [toast, transaction, navigate, queryClient]);

  const categories = getCategoriesForType(transactionType);

  return (
    <Layout>
      <div className="container mx-auto p-4 max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-2" 
            onClick={() => navigate("/transactions")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{transaction ? 'Edit' : 'Add'} Transaction</h1>
        </div>
        
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={(value: TransactionType) => handleTypeChange(value)}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[250px] overflow-y-auto">
                        <SelectItem value="credit">Credit (Income)</SelectItem>
                        <SelectItem value="debit">Debit (Expense)</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter transaction details..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/transactions")}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {transaction ? 'Update' : 'Add'} Transaction
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
};

export default AddTransactionPage;

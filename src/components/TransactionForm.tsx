import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { Transaction, TransactionType, getCategoriesForType } from "@/types/transactions";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { addTransaction, queueTransactionForSync } from "@/services/offlineStorage"; 
import { ScrollArea } from "@/components/ui/scroll-area";

const transactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["credit", "debit", "savings"] as const),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required")
});

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionAdded?: () => void;
  transaction?: Transaction | null;
}

export const TransactionForm = ({
  open,
  onOpenChange,
  onTransactionAdded,
  transaction
}: TransactionFormProps) => {
  const { toast } = useToast();
  const [transactionType, setTransactionType] = useState<TransactionType>(transaction?.type || "debit");
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
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

  useEffect(() => {
    if (open) {
      if (transaction) {
        form.reset({
          date: transaction.date,
          amount: transaction.amount.toString(),
          type: transaction.type,
          category: transaction.category,
          description: transaction.description
        });
        setTransactionType(transaction.type);
      } else {
        form.reset({
          date: new Date().toISOString().split("T")[0],
          amount: "",
          type: "debit",
          category: "",
          description: ""
        });
        setTransactionType("debit");
      }
    }
  }, [transaction, form, open]);

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
      
      onOpenChange(false);
      
      if (onTransactionAdded) {
        onTransactionAdded();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }, [toast, transaction, onOpenChange, onTransactionAdded, queryClient]);

  const categories = getCategoriesForType(transactionType);

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        form.reset();
      }
      onOpenChange(open);
    }}>
      <DialogContent 
        className={`${isMobile ? 'w-[95%] max-w-[400px]' : 'sm:max-w-[525px]'} mx-auto overflow-hidden max-h-[90vh]`}
      >
        <ScrollArea 
          className="h-full px-1 overflow-y-auto"
          style={{
            overflowY: 'auto',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y'
          }}
        >
          <DialogHeader>
            <DialogTitle>{transaction ? 'Edit' : 'Add'} Transaction</DialogTitle>
            <DialogDescription>
              Enter the details of your transaction below.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                      <SelectContent>
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
                      <SelectContent
                        className="overflow-y-auto"
                      >
                        <ScrollArea className="h-72">
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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {transaction ? 'Update' : 'Add'} Transaction
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Transaction, transactionCategories } from "@/types/transactions";

const transactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["credit", "debit", "savings"]),
  category: z.enum(transactionCategories),
  description: z.string().min(1, "Description is required")
});

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionAdded?: () => void;
  transaction?: Transaction | null;
}

export function TransactionForm({
  open,
  onOpenChange,
  onTransactionAdded,
  transaction
}: TransactionFormProps) {
  const {
    toast
  } = useToast();
  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      amount: "",
      type: "debit",
      category: "Food",
      description: ""
    }
  });

  useEffect(() => {
    if (transaction) {
      form.reset({
        date: transaction.date,
        amount: transaction.amount.toString(),
        type: transaction.type,
        category: transaction.category,
        description: transaction.description
      });
    } else {
      form.reset({
        date: new Date().toISOString().split("T")[0],
        amount: "",
        type: "debit",
        category: "Food",
        description: ""
      });
    }
  }, [transaction, form]);

  async function onSubmit(values: z.infer<typeof transactionSchema>) {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      const transactionData = {
        date: values.date,
        amount: parseFloat(values.amount),
        type: values.type,
        category: values.category,
        description: values.description,
        user_id: user.id
      };
      if (transaction) {
        const {
          error
        } = await supabase.from('transactions').update(transactionData).eq('id', transaction.id);
        if (error) throw error;
      } else {
        const {
          error
        } = await supabase.from('transactions').insert([transactionData]);
        if (error) throw error;
      }
      toast({
        title: "Success",
        description: `Transaction ${transaction ? 'updated' : 'added'} successfully`
      });
      onTransactionAdded?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Edit' : 'Add'} Transaction</DialogTitle>
          <DialogDescription>
            Enter the details of your transaction below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="date" render={({
              field
            }) => <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              <FormField control={form.control} name="amount" render={({
              field
            }) => <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="type" render={({
              field
            }) => <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  </FormItem>} />

              <FormField control={form.control} name="category" render={({
              field
            }) => <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#f6f6f6]/[0.86]">
                        {transactionCategories.map(category => <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
            </div>

            <FormField control={form.control} name="description" render={({
            field
          }) => <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter transaction details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {transaction ? 'Update' : 'Add'} Transaction
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>;
}

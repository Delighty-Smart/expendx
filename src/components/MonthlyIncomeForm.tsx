
import { useState } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";

const monthlyIncomeSchema = z.object({
  amount: z.string().min(1, "Monthly income is required"),
});

interface MonthlyIncomeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIncomeAdded?: () => void;
}

export function MonthlyIncomeForm({
  open,
  onOpenChange,
  onIncomeAdded,
}: MonthlyIncomeFormProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof monthlyIncomeSchema>>({
    resolver: zodResolver(monthlyIncomeSchema),
    defaultValues: {
      amount: "",
    },
  });

  async function onSubmit(values: z.infer<typeof monthlyIncomeSchema>) {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("No user found");

      const incomeData = {
        amount: parseFloat(values.amount),
        user_id: user.id,
      };

      const { error } = await supabase
        .from("monthly_income_estimates")
        .upsert(
          incomeData,
          {
            onConflict: "user_id",
          }
        );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Monthly income estimate updated successfully",
      });

      onIncomeAdded?.();
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
      <DialogContent className="sm:max-w-[480px]">

        <DialogHeader>
          <DialogTitle>Set Monthly Income</DialogTitle>
          <DialogDescription>
            Set your estimated monthly income for better budget tracking.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Income</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      className="h-11 bg-muted/30 border-none rounded-xl font-bold"
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
                variant="ghost"
                className="h-12 rounded-xl px-6 font-bold text-muted-foreground hover:text-foreground"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-12 rounded-xl px-8 font-bold hover:scale-105 active:scale-95 transition-all"
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default MonthlyIncomeForm;

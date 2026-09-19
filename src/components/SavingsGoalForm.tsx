
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { savingsCategories, SavingsGoal } from "@/types/transactions";
import { useSettings } from "@/contexts/SettingsContext";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  const isEditing = !!savingsGoalId;

  useEffect(() => {
    if (open && savingsGoalId) {
      const fetchSavingsGoal = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'savings_goals', savingsGoalId));

          if (docSnap.exists()) {
            const goalData = docSnap.data() as SavingsGoal;
            form.reset({
              category: goalData.category,
              target_amount: goalData.target_amount.toString(),
            });
          }
        } catch (error) {
          console.error("Failed to fetch savings goal:", error);
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
      const user = auth.currentUser;
      if (!user) throw new Error("No user found");

      const targetAmount = parseFloat(values.target_amount);

      if (isEditing && savingsGoalId) {
        // Update existing savings goal
        await updateDoc(doc(db, 'savings_goals', savingsGoalId), {
          category: values.category,
          target_amount: targetAmount,
          updated_at: new Date().toISOString()
        });

        toast({
          title: "Success",
          description: "Savings goal updated successfully"
        });
      } else {
        // Check if a goal for this category already exists
        const q = query(
          collection(db, 'savings_goals'),
          where('category', '==', values.category),
          where('user_id', '==', user.uid)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const existingDoc = snapshot.docs[0];
          await updateDoc(doc(db, 'savings_goals', existingDoc.id), {
            target_amount: targetAmount,
            updated_at: new Date().toISOString()
          });

          toast({
            title: "Success",
            description: "Savings goal updated successfully"
          });
        } else {
          // Insert new savings goal
          const newDocRef = doc(collection(db, 'savings_goals'));
          await setDoc(newDocRef, {
            id: newDocRef.id,
            category: values.category,
            target_amount: targetAmount,
            current_amount: 0,
            user_id: user.uid,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

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
      <DialogContent className="sm:max-w-[480px]">

        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} Savings Goal</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update your' : 'Set a'} target amount for your savings category.
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
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 bg-muted/30 border-none rounded-xl font-medium">
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
                    <Input type="number" step="0.01" min="0" {...field} className="h-11 bg-muted/30 border-none rounded-xl font-bold" disabled={loading} />
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
                className="h-12 rounded-xl px-8 font-bold hover:scale-105 active:scale-95 transition-all"
                disabled={loading}
              >
                {loading ? "Saving..." : isEditing ? "Update Goal" : "Save Goal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default SavingsGoalForm;

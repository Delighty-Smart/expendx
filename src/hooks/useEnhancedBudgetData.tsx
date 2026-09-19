import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}

export function useEnhancedBudgetData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: budgets,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['enhanced_budgets'],
    queryFn: async () => {
      // Get from local cache first
      const cachedBudgets = enhancedOfflineManager.getBudgets();

      // If online, trigger background sync
      if (navigator.onLine) {
        enhancedOfflineManager.performFullDataSync().catch(error => {
          console.error("Background budget sync failed:", error);
        });
      }

      return cachedBudgets;
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  const addBudgetOffline = useCallback(async (budgetData: { category: string; monthly_limit: number }) => {
    try {
      if (navigator.onLine) {
        const user = auth.currentUser;
        if (!user) throw new Error("No user found");

        const docRef = doc(collection(db, "budget_categories"));
        await setDoc(docRef, {
          id: docRef.id,
          ...budgetData,
          user_id: user.uid,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['enhanced_budgets'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });

        toast({
          title: "Success",
          description: "Budget added successfully"
        });
      } else {
        toast({
          title: "Offline Mode",
          description: "Budget will be added when you're back online",
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error("Error adding budget:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [toast, queryClient]);

  const updateBudgetOffline = useCallback(async (id: string, updates: Partial<Budget>) => {
    try {
      if (navigator.onLine) {
        const user = auth.currentUser;
        if (!user) throw new Error("No user found");

        await updateDoc(doc(db, "budget_categories", id), {
          ...updates,
          updated_at: new Date().toISOString()
        });

        queryClient.invalidateQueries({ queryKey: ['enhanced_budgets'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });

        toast({
          title: "Success",
          description: "Budget updated successfully"
        });
      } else {
        toast({
          title: "Offline Mode",
          description: "Budget changes will sync when you're back online",
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error("Error updating budget:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [toast, queryClient]);

  const deleteBudgetOffline = useCallback(async (id: string) => {
    try {
      if (navigator.onLine) {
        const user = auth.currentUser;
        if (!user) throw new Error("No user found");

        await deleteDoc(doc(db, "budget_categories", id));

        queryClient.invalidateQueries({ queryKey: ['enhanced_budgets'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });

        toast({
          title: "Success",
          description: "Budget deleted successfully"
        });
      } else {
        toast({
          title: "Offline Mode",
          description: "Budget deletion will sync when you're back online",
          variant: "default"
        });
      }
    } catch (error: any) {
      console.error("Error deleting budget:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [toast, queryClient]);

  return {
    budgets,
    isLoading,
    isError,
    error,
    refetch,
    addBudgetOffline,
    updateBudgetOffline,
    deleteBudgetOffline
  };
}

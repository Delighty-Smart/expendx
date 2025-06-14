
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      console.log("Fetching budgets with enhanced offline support");
      
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
      // Add to sync queue since budgets aren't fully implemented in offline manager yet
      if (navigator.onLine) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found");

        const { error } = await supabase
          .from("budget_categories")
          .insert({ ...budgetData, user_id: user.id });

        if (error) throw error;
        
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found");

        const { error } = await supabase
          .from("budget_categories")
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found");

        const { error } = await supabase
          .from("budget_categories")
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        
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

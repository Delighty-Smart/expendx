
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Transaction, TransactionType } from "@/types/transactions";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";
import { useToast } from "@/hooks/use-toast";

export function useEnhancedTransactionData(filter?: {
  type?: TransactionType | "all",
  startDate?: string,
  endDate?: string,
  category?: string,
  includeArchived?: boolean,
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const queryKey = filter 
    ? ['enhanced_transactions', filter.type, filter.startDate, filter.endDate, filter.category, filter.includeArchived]
    : ['enhanced_transactions'];

  const { 
    data: transactions, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey,
    queryFn: async () => {
      console.log("Fetching transactions with enhanced offline support, filters:", filter);
      
      // Always try to get from local cache first for immediate response
      const cachedTransactions = enhancedOfflineManager.getTransactions(filter);
      
      // If online, trigger background sync but return cached data immediately
      if (navigator.onLine) {
        enhancedOfflineManager.performFullDataSync().catch(error => {
          console.error("Background sync failed:", error);
        });
      }
      
      return cachedTransactions;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });

  // Set up realtime subscription for when online
  useEffect(() => {
    if (!navigator.onLine) return;

    const channel = supabase
      .channel('enhanced-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('Real-time transaction changes detected:', payload);
          
          // Trigger a background sync to update local cache
          enhancedOfflineManager.performFullDataSync().then(() => {
            queryClient.invalidateQueries({ queryKey: ['enhanced_transactions'] });
          });
          
          const eventType = payload.eventType;
          if (eventType === 'INSERT') {
            toast({
              title: "Transaction Synced",
              description: "A new transaction has been synced from the cloud"
            });
          } else if (eventType === 'UPDATE') {
            toast({
              title: "Transaction Updated", 
              description: "A transaction has been updated and synced"
            });
          } else if (eventType === 'DELETE') {
            toast({
              title: "Transaction Deleted",
              description: "A transaction has been deleted and synced"
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  // Enhanced add transaction with offline support
  const addTransactionOffline = useCallback(async (transactionData: Omit<Transaction, 'id'>) => {
    try {
      const tempId = await enhancedOfflineManager.addTransactionOffline(transactionData);
      
      // Immediately update the query data to show the new transaction
      queryClient.invalidateQueries({ queryKey: ['enhanced_transactions'] });
      
      // Also invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['monthly_income'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      
      const isOffline = !navigator.onLine;
      toast({
        title: isOffline ? "Transaction Saved Offline" : "Transaction Added",
        description: isOffline ? 
          "Transaction saved and will sync when you're back online" : 
          "Transaction saved successfully"
      });
      
      return tempId;
    } catch (error: any) {
      console.error("Error adding transaction:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [toast, queryClient]);

  const updateTransactionOffline = useCallback(async (id: string, updates: Partial<Transaction>) => {
    try {
      await enhancedOfflineManager.updateTransactionOffline(id, updates);
      
      queryClient.invalidateQueries({ queryKey: ['enhanced_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly_income'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      
      const isOffline = !navigator.onLine;
      toast({
        title: isOffline ? "Update Saved Offline" : "Transaction Updated",
        description: isOffline ? 
          "Changes saved and will sync when you're back online" : 
          "Transaction updated successfully"
      });
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [toast, queryClient]);

  const deleteTransactionOffline = useCallback(async (id: string) => {
    try {
      await enhancedOfflineManager.deleteTransactionOffline(id);
      
      queryClient.invalidateQueries({ queryKey: ['enhanced_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly_income'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      
      const isOffline = !navigator.onLine;
      toast({
        title: isOffline ? "Deletion Saved Offline" : "Transaction Deleted",
        description: isOffline ? 
          "Changes saved and will sync when you're back online" : 
          "Transaction deleted successfully"
      });
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [toast, queryClient]);
  
  return {
    transactions,
    isLoading,
    isError,
    error,
    refetch,
    addTransactionOffline,
    updateTransactionOffline,
    deleteTransactionOffline
  };
}

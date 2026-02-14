
<<<<<<< HEAD
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
=======
import { useQuery, useQueryClient } from "@tanstack/react-query";
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Transaction, TransactionType } from "@/types/transactions";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionIntegration } from './useSubscriptionIntegration';

<<<<<<< HEAD
export function useEnhancedTransactionData(filter?: {
  type?: TransactionType | "all",
  startDate?: string,
  endDate?: string,
  category?: string,
=======
export function useEnhancedTransactionData(filter?: { 
  type?: TransactionType | "all", 
  startDate?: string, 
  endDate?: string, 
  category?: string, 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
  includeArchived?: boolean,
}) {
  const { subscriptionOptions, updateSubscriptionStatus } = useSubscriptionIntegration();
  const queryClient = useQueryClient();
  const { toast } = useToast();
<<<<<<< HEAD

  const queryKey = filter
    ? ['enhanced_transactions', filter.type, filter.startDate, filter.endDate, filter.category, filter.includeArchived]
    : ['enhanced_transactions'];

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      console.log("Fetching transactions page:", pageParam, "with filters:", filter);
      const pageSize = 20;
      const from = pageParam * pageSize;
      const to = from + pageSize - 1;

=======
  
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
      console.log("Fetching transactions with enhanced system, filters:", filter);
      
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
      // If online, fetch from database and update cache
      if (navigator.onLine) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No authenticated user');

<<<<<<< HEAD
          let query = supabase.from("transactions").select("*", { count: 'exact' }).eq('user_id', user.id);

=======
          let query = supabase.from("transactions").select("*").eq('user_id', user.id);
          
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
          // Apply filters
          if (!filter?.includeArchived) {
            query = query.eq("archived", false);
          }
<<<<<<< HEAD

=======
          
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
          if (filter) {
            if (filter.type && filter.type !== "all") {
              query = query.eq("type", filter.type);
            }
<<<<<<< HEAD

            if (filter.startDate) {
              query = query.gte("date", filter.startDate);
            }

            if (filter.endDate) {
              query = query.lte("date", filter.endDate);
            }

=======
            
            if (filter.startDate) {
              query = query.gte("date", filter.startDate);
            }
            
            if (filter.endDate) {
              query = query.lte("date", filter.endDate);
            }
            
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
            if (filter.category && filter.category !== "All") {
              query = query.eq("category", filter.category);
            }
          }
<<<<<<< HEAD

          // Apply pagination and sort
          query = query.order("date", { ascending: false }).range(from, to);

          const { data, error, count } = await query;

          if (error) throw error;

=======
          
          query = query.order("date", { ascending: false });
          
          const { data, error } = await query;
          
          if (error) throw error;
          
          // The cache will be updated through performFullDataSync if needed
          // No need to call updateCacheWithFreshData as it doesn't exist
          
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
          return (data || []).map(item => ({
            ...item,
            type: item.type as TransactionType
          }));
        } catch (fetchError) {
          console.error("Error fetching from database:", fetchError);
<<<<<<< HEAD
          // Fallback to cache (simulated pagination)
          const allTransactions = await enhancedOfflineManager.getTransactions(filter);
          return allTransactions.slice(from, from + pageSize);
        }
      }

      // If offline, get from cache (simulated pagination)
      const allTransactions = await enhancedOfflineManager.getTransactions(filter);
      return allTransactions.slice(from, from + pageSize);
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined;
=======
          // Fallback to cache
          return enhancedOfflineManager.getTransactions(filter);
        }
      }
      
      // If offline, get from cache
      return enhancedOfflineManager.getTransactions(filter);
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });

<<<<<<< HEAD
  // Flatten the pages for consumption
  const transactions = data?.pages.flatMap(page => page) || [];
=======
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
          
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['enhanced_transactions'] });
          
          const eventType = payload.eventType;
          if (eventType === 'INSERT') {
            toast({
              title: "Transaction Added",
              description: "A new transaction has been added"
            });
          } else if (eventType === 'UPDATE') {
            toast({
              title: "Transaction Updated", 
              description: "A transaction has been updated"
            });
          } else if (eventType === 'DELETE') {
            toast({
              title: "Transaction Deleted",
              description: "A transaction has been deleted"
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315

  // Enhanced add transaction - handles online/offline automatically
  const addTransactionOffline = useCallback(async (transactionData: Omit<Transaction, 'id'>) => {
    try {
      const tempId = await enhancedOfflineManager.addTransactionOffline(transactionData);
<<<<<<< HEAD

=======
      
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
      // Check if this transaction matches any subscription and update status
      if (transactionData.category === 'Subscriptions' && transactionData.type === 'debit') {
        console.log('Transaction is subscription type, checking for matches:', {
          category: transactionData.category,
          type: transactionData.type,
          amount: transactionData.amount,
          availableSubscriptions: subscriptionOptions.length
        });
<<<<<<< HEAD

=======
        
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
        const matchingSubscription = subscriptionOptions.find(option => {
          const amountMatch = Math.abs(parseFloat(option.subscription.amount.toString()) - transactionData.amount) < 0.01;
          console.log('Checking subscription match:', {
            subscriptionId: option.subscription.id,
            subscriptionAmount: option.subscription.amount,
            transactionAmount: transactionData.amount,
            amountMatch
          });
          return amountMatch;
        });
<<<<<<< HEAD

=======
        
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
        if (matchingSubscription) {
          console.log('Found matching subscription, updating status:', matchingSubscription.subscription.id);
          try {
            await updateSubscriptionStatus(matchingSubscription.subscription.id, transactionData.amount);
          } catch (subscriptionError) {
            console.error('Error updating subscription status:', subscriptionError);
            // Don't throw here as the transaction was still added successfully
          }
        } else {
          console.log('No matching subscription found for amount:', transactionData.amount);
        }
      }
<<<<<<< HEAD

=======
      
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
      // Immediately update the query data
      queryClient.invalidateQueries({ queryKey: ['enhanced_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly_income'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
<<<<<<< HEAD

      const isOffline = !navigator.onLine;
      toast({
        title: isOffline ? "Transaction Saved Offline" : "Transaction Added",
        description: isOffline ?
          "Transaction saved and will sync when you're back online" :
          "Transaction saved successfully"
      });

=======
      
      const isOffline = !navigator.onLine;
      toast({
        title: isOffline ? "Transaction Saved Offline" : "Transaction Added",
        description: isOffline ? 
          "Transaction saved and will sync when you're back online" : 
          "Transaction saved successfully"
      });
      
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
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
  }, [toast, queryClient, subscriptionOptions, updateSubscriptionStatus]);

  const updateTransactionOffline = useCallback(async (id: string, updates: Partial<Transaction>) => {
    try {
      await enhancedOfflineManager.updateTransactionOffline(id, updates);
<<<<<<< HEAD

      queryClient.invalidateQueries({ queryKey: ['enhanced_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly_income'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });

      const isOffline = !navigator.onLine;
      toast({
        title: isOffline ? "Update Saved Offline" : "Transaction Updated",
        description: isOffline ?
          "Changes saved and will sync when you're back online" :
=======
      
      queryClient.invalidateQueries({ queryKey: ['enhanced_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly_income'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      
      const isOffline = !navigator.onLine;
      toast({
        title: isOffline ? "Update Saved Offline" : "Transaction Updated",
        description: isOffline ? 
          "Changes saved and will sync when you're back online" : 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
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
<<<<<<< HEAD

      queryClient.invalidateQueries({ queryKey: ['enhanced_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly_income'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });

      const isOffline = !navigator.onLine;
      toast({
        title: isOffline ? "Deletion Saved Offline" : "Transaction Deleted",
        description: isOffline ?
          "Changes saved and will sync when you're back online" :
=======
      
      queryClient.invalidateQueries({ queryKey: ['enhanced_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly_income'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      
      const isOffline = !navigator.onLine;
      toast({
        title: isOffline ? "Deletion Saved Offline" : "Transaction Deleted",
        description: isOffline ? 
          "Changes saved and will sync when you're back online" : 
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
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
<<<<<<< HEAD

=======
  
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
  return {
    transactions,
    isLoading,
    isError,
    error,
    refetch,
<<<<<<< HEAD
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
=======
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
    addTransactionOffline,
    updateTransactionOffline,
    deleteTransactionOffline
  };
}

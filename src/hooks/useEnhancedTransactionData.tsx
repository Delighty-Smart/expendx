

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Transaction, TransactionType } from "@/types/transactions";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionIntegration } from './useSubscriptionIntegration';


export function useEnhancedTransactionData(filter?: {
  type?: TransactionType | "all",
  startDate?: string,
  endDate?: string,
  category?: string,

  includeArchived?: boolean,
}) {
  const { subscriptionOptions, updateSubscriptionStatus } = useSubscriptionIntegration();
  const queryClient = useQueryClient();
  const { toast } = useToast();


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


      // If online, fetch from database and update cache
      if (navigator.onLine) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No authenticated user');


          let query = supabase.from("transactions").select("*", { count: 'exact' }).eq('user_id', user.id);


          // Apply filters
          if (!filter?.includeArchived) {
            query = query.eq("archived", false);
          }



          if (filter) {
            if (filter.type && filter.type !== "all") {
              query = query.eq("type", filter.type);
            }


            if (filter.startDate) {
              query = query.gte("date", filter.startDate);
            }

            if (filter.endDate) {
              query = query.lte("date", filter.endDate);
            }


            if (filter.category && filter.category !== "All") {
              query = query.eq("category", filter.category);
            }
          }


          // Apply pagination and sort
          query = query.order("date", { ascending: false }).range(from, to);

          const { data, error, count } = await query;

          if (error) throw error;


          return (data || []).map(item => ({
            ...item,
            type: item.type as TransactionType
          }));
        } catch (fetchError) {
          console.error("Error fetching from database:", fetchError);

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

    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });


  // Flatten the pages for consumption
  const transactions = data?.pages.flatMap(page => page) || [];


  // Enhanced add transaction - handles online/offline automatically
  const addTransactionOffline = useCallback(async (transactionData: Omit<Transaction, 'id'>) => {
    try {
      const tempId = await enhancedOfflineManager.addTransactionOffline(transactionData);



      // Check if this transaction matches any subscription and update status
      if (transactionData.category === 'Subscriptions' && transactionData.type === 'debit') {
        console.log('Transaction is subscription type, checking for matches:', {
          category: transactionData.category,
          type: transactionData.type,
          amount: transactionData.amount,
          availableSubscriptions: subscriptionOptions.length
        });



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



      // Immediately update the query data
      queryClient.invalidateQueries({ queryKey: ['enhanced_transactions'] });
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
  }, [toast, queryClient, subscriptionOptions, updateSubscriptionStatus]);

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

    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,

    addTransactionOffline,
    updateTransactionOffline,
    deleteTransactionOffline
  };
}


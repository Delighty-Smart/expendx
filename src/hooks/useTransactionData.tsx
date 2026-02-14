import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Transaction, TransactionType, TransactionCategory } from "@/types/transactions";
import { initializeDB, getAllTransactions } from "@/services/offlineStorage";
import {
  initializeEnhancedDB,
  addTransactionEnhanced,
  batchUpdateTransactionsEnhanced,
} from "@/services/enhancedOfflineStorage";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";
import { syncManager } from "@/services/syncManager";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionIntegration } from './useSubscriptionIntegration';
import { normalizeDate } from "@/lib/utils";

// Helper to convert raw transaction data to proper Transaction type
export const convertToTransaction = (transaction: any): Transaction => ({
  ...transaction,
  amount: isNaN(Number(transaction.amount)) ? 0 : Number(transaction.amount),
  type: transaction.type as TransactionType,
  category: (transaction.category || "Uncategorized") as TransactionCategory
});

export function useTransactionData(filter?: {
  type?: TransactionType | "all",
  startDate?: string,
  endDate?: string,
  category?: string,
  includeArchived?: boolean,
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { subscriptionOptions, updateSubscriptionStatus } = useSubscriptionIntegration();

  // Create query key based on filters
  const queryKey = filter
    ? ['transactions', filter.type, filter.startDate, filter.endDate, filter.category, filter.includeArchived]
    : ['transactions'];

  // Setup the main query with enhanced offline support
  const {
    data: transactions,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const normalizedStartDate = normalizeDate(filter?.startDate);
      const normalizedEndDate = normalizeDate(filter?.endDate);

      console.log("Fetching transactions with filters:", { ...filter, startDate: normalizedStartDate, endDate: normalizedEndDate });

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        let query = supabase.from("transactions")
          .select("*")
          .eq("user_id", user.id);

        // ALWAYS exclude archived transactions unless explicitly included
        if (!filter?.includeArchived) {
          query = query.eq("archived", false);
        }

        // Apply filters if provided
        if (filter) {
          if (filter.type && filter.type !== "all") {
            query = query.eq("type", filter.type);
          }

          if (normalizedStartDate) {
            query = query.gte("date", normalizedStartDate);
          }

          if (normalizedEndDate) {
            query = query.lte("date", normalizedEndDate);
          }

          if (filter.category && filter.category !== "All") {
            query = query.eq("category", filter.category);
          }
        }

        // Sort by newest first
        query = query.order("date", { ascending: false });

        const { data, error, count } = await query;

        if (error) {
          console.error("Supabase fetch error:", error);
          throw error;
        }

        console.log(`Successfully fetched ${data?.length || 0} transactions from Supabase`);

        // Update local cache with fresh data
        if (data && data.length > 0) {
          try {
            await batchUpdateTransactionsEnhanced(data);
          } catch (cacheUpdateError) {
            console.warn("Failed to update local cache, but continuing with fresh data:", cacheUpdateError);
          }
        }

        // Convert to Transaction type
        return (data || []).map(convertToTransaction);
      } catch (fetchError) {
        console.error("Error fetching transactions from database:", fetchError);

        // If online fetch fails, try from enhanced local cache
        try {
          const effectiveFilter = filter ? {
            ...filter,
            startDate: normalizedStartDate,
            endDate: normalizedEndDate
          } : undefined;

          const filteredTransactions = await enhancedOfflineManager.getTransactions(effectiveFilter);
          console.log("Loaded transactions from enhanced cache manager:", filteredTransactions.length);

          return filteredTransactions.map(convertToTransaction);
        } catch (cacheError) {
          console.error("Error getting cached transactions:", cacheError);
          throw fetchError; // Re-throw original error
        }
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });

  // Set up realtime subscription
  useEffect(() => {
    console.log("Setting up real-time subscription to transactions table");

    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('Transaction changes detected:', payload);

          // Handle different event types
          const eventType = payload.eventType;

          if (eventType === 'INSERT') {
            toast({
              title: "Transaction Added",
              description: "A new transaction has been added to your account"
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

          // Invalidate all transaction queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['transactions'] });

          // Also invalidate related queries that depend on transaction data
          queryClient.invalidateQueries({ queryKey: ['monthly_income'] });
          queryClient.invalidateQueries({ queryKey: ['budgets'] });
        }
      )
      .subscribe();

    // Clean up subscription
    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  // Initialize enhanced offline storage and sync
  useEffect(() => {
    const setupEnhancedOfflineStorage = async () => {
      try {
        // Initialize both storage systems for backward compatibility
        await initializeDB();
        await initializeEnhancedDB();
        console.log("Enhanced offline storage initialized");

        // Try to sync any pending transactions
        if (navigator.onLine) {
          await syncManager.performSync();
        }
      } catch (err) {
        console.error("Failed to initialize enhanced offline storage:", err);
      }
    };

    setupEnhancedOfflineStorage();
  }, []);

  // Function to add transaction with enhanced offline support
  const addTransactionWithCache = useCallback(async (transactionData: Omit<Transaction, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const transaction = {
        ...transactionData,
        user_id: user.id
      };

      // Always store locally first for immediate UI updates
      const tempId = await addTransactionEnhanced(transaction);

      // Check if this transaction matches any subscription and update status
      if (transactionData.category === 'Subscriptions' && transactionData.type === 'debit') {
        const matchingSubscription = subscriptionOptions.find(option =>
          Math.abs(parseFloat(option.subscription.amount.toString()) - transactionData.amount) < 0.01
        );

        if (matchingSubscription) {
          try {
            await updateSubscriptionStatus(matchingSubscription.subscription.id, transactionData.amount);
          } catch (subscriptionError) {
            console.error('Error updating subscription status:', subscriptionError);
            // Don't throw here as the transaction was still added successfully
          }
        }
      }

      if (navigator.onLine) {
        try {
          // Try to sync immediately if online
          const { data, error } = await supabase
            .from('transactions')
            .insert([transaction])
            .select()
            .single();

          if (error) throw error;

          toast({
            title: "Transaction Added",
            description: "Transaction saved successfully"
          });

          return data;
        } catch (syncError) {
          console.log("Immediate sync failed, will retry later:", syncError);
          toast({
            title: "Transaction Saved Offline",
            description: "Transaction saved locally and will sync when online"
          });
        }
      } else {
        toast({
          title: "Transaction Saved Offline",
          description: "This transaction will be synced when you're back online"
        });
      }

      return { ...transaction, id: tempId };
    } catch (error: any) {
      console.error("Error adding transaction:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [toast, subscriptionOptions, updateSubscriptionStatus]);

  return {
    transactions,
    isLoading,
    isError,
    error,
    refetch,
    addTransactionWithCache
  };
}

// Add type to make the result of useTransactionData more predictable
export type TransactionDataResult = ReturnType<typeof useTransactionData>;

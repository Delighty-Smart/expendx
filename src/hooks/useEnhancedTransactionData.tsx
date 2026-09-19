
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, limit, startAfter, QueryConstraint } from "firebase/firestore";

export function useEnhancedTransactionData(filter?: {
  type?: TransactionType | "all",
  startDate?: string,
  endDate?: string,
  category?: string,
  includeArchived?: boolean,
}) {
  const { user } = useAuth();
  const { subscriptionOptions, updateSubscriptionStatus } = useSubscriptionIntegration();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = filter
    ? ['enhanced_transactions', user?.id, filter.type, filter.startDate, filter.endDate, filter.category, filter.includeArchived]
    : ['enhanced_transactions', user?.id];

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
    enabled: !!user,
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) {
        throw new Error('No authenticated user');
      }

      const normalizedStartDate = normalizeDate(filter?.startDate);
      const normalizedEndDate = normalizeDate(filter?.endDate);
      const effectiveFilter = filter ? { ...filter, startDate: normalizedStartDate, endDate: normalizedEndDate } : undefined;

      const pageSize = 20;
      const from = pageParam * pageSize;

      if (navigator.onLine) {
        try {
          const constraints: QueryConstraint[] = [
            where("user_id", "==", user.id)
          ];

          if (!filter?.includeArchived) {
            constraints.push(where("archived", "==", false));
          }

          if (filter) {
            if (filter.type && filter.type !== "all") {
              constraints.push(where("type", "==", filter.type));
            }
            if (normalizedStartDate) {
              constraints.push(where("date", ">=", normalizedStartDate));
            }
            if (normalizedEndDate) {
              constraints.push(where("date", "<=", normalizedEndDate));
            }
            if (filter.category && filter.category !== "All") {
              constraints.push(where("category", "==", filter.category));
            }
          }

          constraints.push(orderBy("date", "desc"));

          const q = query(collection(db, "transactions"), ...constraints);
          const snap = await getDocs(q);

          const allFetched = snap.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            type: docSnap.data().type as TransactionType
          })) as Transaction[];

          return allFetched.slice(from, from + pageSize);
        } catch (fetchError) {
          const allTransactions = await enhancedOfflineManager.getTransactions(effectiveFilter);
          return allTransactions.slice(from, from + pageSize);
        }
      }

      const allTransactions = await enhancedOfflineManager.getTransactions(effectiveFilter);
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
        const matchingSubscription = subscriptionOptions.find(option => {
          const amountMatch = Math.abs(parseFloat(option.subscription.amount.toString()) - transactionData.amount) < 0.01;
          return amountMatch;
        });

        if (matchingSubscription) {
          try {
            await updateSubscriptionStatus(matchingSubscription.subscription.id, transactionData.amount);
          } catch (subscriptionError) {
            console.error('Error updating subscription status:', subscriptionError);
          }
        }
      }

      // Batch query invalidations
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

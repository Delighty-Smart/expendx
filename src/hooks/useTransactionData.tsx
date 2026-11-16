import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { where, orderBy, QueryConstraint } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Transaction, TransactionType } from "@/types/transactions";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";
import { getDocsWithIndexFallback, sortByDateDesc, filterTransactions } from "@/lib/query-fallback";
import { useCallback } from "react";

export function useTransactionData(filter?: {
  type?: TransactionType | "all",
  startDate?: string,
  endDate?: string,
  category?: string,
  includeArchived?: boolean,
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Create query key based on filters
  const queryKey = filter
    ? ['transactions', user?.id, filter.type, filter.startDate, filter.endDate, filter.category, filter.includeArchived]
    : ['transactions', user?.id];

  const { data: transactions = [], isLoading, error, refetch } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async () => {
      // If online, fetch from database
      if (navigator.onLine) {
        try {
          const constraints: QueryConstraint[] = [
            where("user_id", "==", user!.id)
          ];

          if (!filter?.includeArchived) {
            constraints.push(where("archived", "==", false));
          }

          if (filter) {
            if (filter.type && filter.type !== "all") {
              constraints.push(where("type", "==", filter.type));
            }
            if (filter.startDate) {
              constraints.push(where("date", ">=", filter.startDate));
            }
            if (filter.endDate) {
              constraints.push(where("date", "<=", filter.endDate));
            }
            if (filter.category && filter.category !== "All") {
              constraints.push(where("category", "==", filter.category));
            }
          }

          // Only `user_id` is guaranteed to be indexed; every other filter is
          // also applied in memory so the list renders even before the
          // composite indexes exist.
          const fallbackConstraints: QueryConstraint[] = [where("user_id", "==", user!.id)];

          const snap = await getDocsWithIndexFallback(
            db,
            "transactions",
            constraints,
            orderBy("date", "desc"),
            fallbackConstraints
          );

          const rows = snap.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              type: data.type as TransactionType
            } as Transaction;
          });

          return sortByDateDesc(
            filterTransactions(rows, filter, filter?.startDate, filter?.endDate)
          );
        } catch (fetchError) {
          console.error("useTransactionData: Fallback to cache", fetchError);
          return enhancedOfflineManager.getTransactions(filter);
        }
      }

      // If offline, get from cache
      return enhancedOfflineManager.getTransactions(filter);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id'>) => {
    const id = await enhancedOfflineManager.addTransactionOffline(transactionData);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    return id;
  }, [queryClient]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    await enhancedOfflineManager.updateTransactionOffline(id, updates);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }, [queryClient]);

  const deleteTransaction = useCallback(async (id: string) => {
    await enhancedOfflineManager.deleteTransactionOffline(id);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }, [queryClient]);

  return {
    transactions,
    isLoading,
    error,
    refetch,
    addTransaction,
    updateTransaction,
    deleteTransaction
  };
}

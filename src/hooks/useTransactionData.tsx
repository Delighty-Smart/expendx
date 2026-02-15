import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Transaction, TransactionType } from "@/types/transactions";
import { enhancedOfflineManager } from "@/services/enhancedOfflineManager";
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
          let query = supabase.from("transactions")
            .select("*")
            .eq("user_id", user!.id);

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

          const { data, error } = await query.order("date", { ascending: false });

          if (error) throw error;

          return (data || []).map(item => ({
            ...item,
            type: item.type as TransactionType
          })) as Transaction[];
        } catch (fetchError) {
          console.error("useTransactionData: Fallback to cache", fetchError);
          return enhancedOfflineManager.getTransactions();
        }
      }

      // If offline, get from cache
      return enhancedOfflineManager.getTransactions();
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

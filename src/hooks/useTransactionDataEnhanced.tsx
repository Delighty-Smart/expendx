
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { Transaction, TransactionType, TransactionCategory } from "@/types/transactions";
import { useToast } from "@/hooks/use-toast";
import { useOfflineData } from "./useOfflineData";

// Helper to convert raw transaction data to proper Transaction type
export const convertToTransaction = (transaction: any): Transaction => ({
  ...transaction,
  type: transaction.type as TransactionType,
  category: transaction.category as TransactionCategory
});

export function useTransactionDataEnhanced(filter?: {
  type?: TransactionType | "all",
  startDate?: string,
  endDate?: string,
  category?: string,
  includeArchived?: boolean,
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { status: offlineStatus, getData, addData, updateData } = useOfflineData();
  
  // Create query key based on filters
  const queryKey = filter 
    ? ['transactions-enhanced', filter.type, filter.startDate, filter.endDate, filter.category, filter.includeArchived]
    : ['transactions-enhanced'];

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
      console.log("Fetching transactions with enhanced offline support, filters:", filter);
      
      try {
        // Use offline data manager
        let allTransactions = await getData('transactions');
        
        // Apply filters
        let filteredTransactions = allTransactions;
        
        if (filter) {
          filteredTransactions = allTransactions.filter(t => {
            let matches = true;
            
            // ALWAYS exclude archived by default unless explicitly included
            if (!filter.includeArchived && t.archived) {
              matches = false;
            }
            
            if (filter.type && filter.type !== "all") {
              matches = matches && t.type === filter.type;
            }
            
            if (filter.startDate) {
              matches = matches && t.date >= filter.startDate;
            }
            
            if (filter.endDate) {
              matches = matches && t.date <= filter.endDate;
            }
            
            if (filter.category && filter.category !== "All") {
              matches = matches && t.category === filter.category;
            }
            
            return matches;
          });
        } else {
          // If no filter, ALWAYS exclude archived by default
          filteredTransactions = allTransactions.filter(t => !t.archived);
        }
        
        // Sort by newest first
        filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return filteredTransactions.map(convertToTransaction);
      } catch (fetchError) {
        console.error("Error fetching transactions:", fetchError);
        throw fetchError;
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - shorter for more responsive offline experience
    gcTime: 1000 * 60 * 5,    // 5 minutes
    enabled: offlineStatus.isInitialized, // Only run when offline storage is ready
  });

  // Function to add transaction with enhanced offline support
  const addTransactionWithCache = useCallback(async (transactionData: Omit<Transaction, 'id'>) => {
    try {
      const transaction = {
        ...transactionData,
        user_id: transactionData.user_id || localStorage.getItem('cached_user_id'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived: false
      };
      
      if (!transaction.user_id) {
        throw new Error("User ID not available");
      }
      
      const id = await addData('transactions', transaction);
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['monthly_income'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      
      if (navigator.onLine) {
        toast({
          title: "Transaction Added",
          description: "Transaction saved successfully"
        });
      } else {
        toast({
          title: "Transaction Saved Offline",
          description: "This transaction will sync when you're back online"
        });
      }
      
      return { ...transaction, id };
    } catch (error: any) {
      console.error("Error adding transaction:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [addData, toast, queryClient]);

  // Function to update transaction with enhanced offline support
  const updateTransactionWithCache = useCallback(async (id: string, updates: Partial<Transaction>) => {
    try {
      const updatedData = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      await updateData('transactions', id, updatedData);
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['monthly_income'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      
      if (navigator.onLine) {
        toast({
          title: "Transaction Updated",
          description: "Transaction updated successfully"
        });
      } else {
        toast({
          title: "Transaction Updated Offline",
          description: "Changes will sync when you're back online"
        });
      }
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  }, [updateData, toast, queryClient]);
  
  return {
    transactions,
    isLoading: isLoading || !offlineStatus.isInitialized,
    isError,
    error,
    refetch,
    addTransactionWithCache,
    updateTransactionWithCache,
    offlineStatus
  };
}

// Add type to make the result more predictable
export type TransactionDataEnhancedResult = ReturnType<typeof useTransactionDataEnhanced>;

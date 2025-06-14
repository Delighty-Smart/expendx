
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Transaction, TransactionType, TransactionCategory } from "@/types/transactions";
import { EnhancedOfflineStorage } from "@/services/enhancedOfflineStorage";
import { useToast } from "@/hooks/use-toast";
import { syncManager } from "@/services/syncManager";

// Helper to convert raw transaction data to proper Transaction type
export const convertToTransaction = (transaction: any): Transaction => ({
  ...transaction,
  type: transaction.type as TransactionType,
  category: transaction.category as TransactionCategory
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
  
  // Create query key based on filters
  const queryKey = filter 
    ? ['transactions', filter.type, filter.startDate, filter.endDate, filter.category, filter.includeArchived]
    : ['transactions'];

  // Setup the main query
  const { 
    data: transactions, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey,
    queryFn: async () => {
      console.log("Fetching transactions with filters:", filter);
      
      try {
        // Try online first if available
        if (navigator.onLine) {
          let query = supabase.from("transactions").select("*");
          
          // ALWAYS exclude archived transactions unless explicitly included
          if (!filter?.includeArchived) {
            query = query.eq("archived", false);
          }
          
          // Apply filters if provided
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
          
          // Sort by newest first
          query = query.order("date", { ascending: false });
          
          const { data, error } = await query;
          
          if (error) throw error;
          
          // Convert to Transaction type and return
          return (data || []).map(convertToTransaction);
        }
      } catch (fetchError) {
        console.error("Error fetching transactions from database:", fetchError);
      }
      
      // Fallback to offline storage
      try {
        const cachedTransactions = await EnhancedOfflineStorage.getTransactions();
        console.log("Loaded transactions from offline storage:", cachedTransactions.length);
        
        let filteredTransactions = cachedTransactions;
        
        // Apply filters to cached data
        if (filter) {
          filteredTransactions = cachedTransactions.filter(t => {
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
          filteredTransactions = cachedTransactions.filter(t => !t.archived);
        }
        
        return filteredTransactions.map(convertToTransaction);
      } catch (cacheError) {
        console.error("Error getting cached transactions:", cacheError);
        return [];
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
        }
      )
      .subscribe();

    // Clean up subscription
    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  // Initialize enhanced offline storage
  useEffect(() => {
    const setupOfflineStorage = async () => {
      try {
        await EnhancedOfflineStorage.initialize();
        console.log("Enhanced offline storage initialized");
        
        // Try to sync any pending data
        if (navigator.onLine) {
          await syncManager.syncAll();
        }
      } catch (err) {
        console.error("Failed to initialize enhanced offline storage:", err);
      }
    };
    
    setupOfflineStorage();
  }, []);

  // Function to add transaction with enhanced offline support
  const addTransactionWithCache = useCallback(async (transactionData: Omit<Transaction, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const transaction = {
        ...transactionData,
        user_id: user.id,
        id: crypto.randomUUID()
      };
      
      if (navigator.onLine) {
        // Try online first
        try {
          const { data, error } = await supabase
            .from('transactions')
            .insert([transaction])
            .select()
            .single();
            
          if (error) throw error;
          
          // Also add to local cache
          await EnhancedOfflineStorage.addTransactionOffline(data);
          
          toast({
            title: "Transaction Added",
            description: "Transaction saved successfully"
          });
          
          return data;
        } catch (onlineError) {
          console.error("Online save failed, falling back to offline:", onlineError);
          // Fall through to offline save
        }
      }
      
      // Offline save
      console.log("Saving transaction offline:", transaction);
      const tempId = await EnhancedOfflineStorage.addTransactionOffline(transaction);
      
      toast({
        title: "Transaction Saved Offline",
        description: "This transaction will be synced when you're back online"
      });
      
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
  }, [toast]);
  
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

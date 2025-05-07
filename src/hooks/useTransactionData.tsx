
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Transaction, TransactionType, TransactionCategory } from "@/types/transactions";
import { initializeDB, getAllTransactions, addTransaction, trySync } from "@/services/offlineStorage";
import { useToast } from "@/hooks/use-toast";

// Helper to convert raw transaction data to proper Transaction type
export const convertToTransaction = (transaction: any): Transaction => ({
  ...transaction,
  type: transaction.type as TransactionType,
  category: transaction.category as TransactionCategory
});

// Helper function to queue a transaction for sync when offline
const queueTransactionForSync = async (transaction: any): Promise<void> => {
  // If IndexedDB is available in the browser
  if ('indexedDB' in window) {
    // Open our database
    const dbRequest = indexedDB.open('expendx_offline', 1);
    
    dbRequest.onerror = (event) => {
      console.error('Error opening offline database:', event);
    };
    
    dbRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Start a transaction and get the pending_transactions store
      try {
        const tx = db.transaction('pending_transactions', 'readwrite');
        const store = tx.objectStore('pending_transactions');
        
        // Add the transaction to the pending store
        const request = store.put(transaction);
        
        request.onerror = (event) => {
          console.error('Error queuing transaction for sync:', event);
        };
        
        request.onsuccess = () => {
          console.log('Transaction queued for sync when online');
        };
        
        // Close the transaction and database when done
        tx.oncomplete = () => {
          db.close();
        };
      } catch (err) {
        console.error('Error creating transaction:', err);
        db.close();
      }
    };
    
    // If the database doesn't exist, create it with our object stores
    dbRequest.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create pending_transactions store if it doesn't exist
      if (!db.objectStoreNames.contains('pending_transactions')) {
        db.createObjectStore('pending_transactions', { keyPath: 'id' });
      }
    };
  } else {
    console.warn('IndexedDB not supported in this browser, cannot queue transaction');
  }
};

export function useTransactionData(filter?: {
  type?: TransactionType | "all",
  startDate?: string,
  endDate?: string,
  category?: string,
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Create query key based on filters
  const queryKey = filter 
    ? ['transactions', filter.type, filter.startDate, filter.endDate, filter.category]
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
        let query = supabase.from("transactions").select("*");
        
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
        
        // Convert to Transaction type
        return (data || []).map(convertToTransaction);
      } catch (fetchError) {
        console.error("Error fetching transactions from database:", fetchError);
        
        // If online fetch fails, try from local cache
        try {
          await initializeDB();
          const cachedTransactions = await getAllTransactions();
          console.log("Loaded transactions from cache:", cachedTransactions.length);
          
          let filteredTransactions = cachedTransactions;
          
          // Apply filters to cached data
          if (filter) {
            filteredTransactions = cachedTransactions.filter(t => {
              let matches = true;
              
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
          }
          
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
            // Use toast notification for insert
            toast({
              title: "Transaction Added",
              description: "A new transaction has been added to your account"
            });
          } else if (eventType === 'UPDATE') {
            // Use toast notification for update
            toast({
              title: "Transaction Updated",
              description: "A transaction has been updated"
            });
          } else if (eventType === 'DELETE') {
            // Use toast notification for delete
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

  // Initialize offline storage
  useEffect(() => {
    const setupOfflineStorage = async () => {
      try {
        await initializeDB();
        console.log("Offline storage initialized");
        
        // Try to sync any pending transactions
        if (navigator.onLine) {
          await trySync();
        }
      } catch (err) {
        console.error("Failed to initialize offline storage:", err);
      }
    };
    
    setupOfflineStorage();
    
    // Set up online/offline event listeners
    const handleOnline = () => {
      console.log("App is online, attempting to sync transactions");
      trySync().catch(err => console.error('Sync failed:', err));
    };
    
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Function to add transaction with offline support
  const addTransactionWithCache = useCallback(async (transactionData: Omit<Transaction, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const transaction = {
        ...transactionData,
        user_id: user.id
      };
      
      // First try to add to database
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('transactions')
          .insert([transaction])
          .select()
          .single();
          
        if (error) throw error;
        
        // Also add to local cache for offline access
        await addTransaction(data);
        return data;
      } else {
        // If offline, add to local cache and queue for sync
        console.log("Device is offline, storing transaction locally", transaction);
        const tempId = await addTransaction(transaction);
        await queueTransactionForSync(transaction);
        
        toast({
          title: "Transaction Saved Offline",
          description: "This transaction will be synced when you're back online"
        });
        
        return { ...transaction, id: tempId };
      }
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

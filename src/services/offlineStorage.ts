
import { supabase } from '@/integrations/supabase/client';

type Transaction = {
  id?: string;
  user_id?: string;
  date: string;
  amount: number;
  description: string;
  type: string;
  category: string;
  created_at?: string;
  updated_at?: string;
  _offline_id?: string;
  _synced?: boolean;
};

let db: IDBDatabase;

export const initializeDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      console.error("Your browser doesn't support IndexedDB");
      resolve(false);
      return;
    }

    const request = window.indexedDB.open("expendxOfflineDB", 1);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
      reject(new Error("Error opening IndexedDB"));
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      console.log("IndexedDB initialized successfully");
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create transactions store for offline transactions
      if (!db.objectStoreNames.contains("transactions")) {
        const objectStore = db.createObjectStore("transactions", { keyPath: "_offline_id" });
        objectStore.createIndex("user_id", "user_id", { unique: false });
        objectStore.createIndex("_synced", "_synced", { unique: false });
      }
    };
  });
};

export const saveTransactionOffline = (transaction: Transaction): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const offlineId = crypto.randomUUID();
    const offlineTransaction = {
      ...transaction,
      _offline_id: offlineId,
      _synced: false
    };

    const transaction_request = db.transaction(["transactions"], "readwrite");
    const objectStore = transaction_request.objectStore("transactions");
    const request = objectStore.add(offlineTransaction);

    request.onsuccess = () => {
      console.log("Transaction saved offline");
      
      // Attempt to register a sync if the browser supports it
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
          try {
            // Use try-catch here specifically as some browsers don't support background sync
            registration.sync.register('sync-transactions').then(() => {
              console.log('Background sync registered!');
            }).catch(err => {
              console.log('Background sync registration failed:', err);
            });
          } catch (error) {
            console.log('SyncManager error:', error);
          }
        }).catch(err => {
          console.error('Service worker not ready:', err);
        });
      }
      
      resolve(offlineId);
    };

    request.onerror = (event) => {
      console.error("Error saving transaction offline:", event);
      reject(new Error("Error saving transaction"));
    };
  });
};

export const getOfflineTransactions = (): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = db.transaction(["transactions"], "readonly");
    const objectStore = transaction.objectStore("transactions");
    const request = objectStore.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error("Error getting offline transactions:", event);
      reject(new Error("Error getting transactions"));
    };
  });
};

export const syncOfflineTransactions = async (): Promise<number> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log("User not authenticated, can't sync transactions");
      return 0;
    }

    const offlineTransactions = await getOfflineTransactions();
    const unsyncedTransactions = offlineTransactions.filter(t => !t._synced);
    
    if (unsyncedTransactions.length === 0) {
      console.log("No unsynced transactions to upload");
      return 0;
    }

    console.log(`Syncing ${unsyncedTransactions.length} offline transactions`);
    
    let syncedCount = 0;
    const transaction = db.transaction(["transactions"], "readwrite");
    const store = transaction.objectStore("transactions");

    for (const t of unsyncedTransactions) {
      try {
        // Remove offline-specific properties before saving to Supabase
        const { _offline_id, _synced, ...transactionData } = t;
        
        // Ensure user_id is set to current user
        transactionData.user_id = user.id;
        
        const { error } = await supabase
          .from('transactions')
          .insert(transactionData);

        if (error) {
          console.error("Error syncing transaction:", error);
          continue;
        }

        // Mark as synced in offline storage
        const updateRequest = store.put({...t, _synced: true});
        await new Promise((resolve, reject) => {
          updateRequest.onsuccess = resolve;
          updateRequest.onerror = reject;
        });
        
        syncedCount++;
      } catch (error) {
        console.error("Error processing transaction:", error);
      }
    }

    console.log(`Successfully synced ${syncedCount} transactions`);
    return syncedCount;
  } catch (error) {
    console.error("Error in syncOfflineTransactions:", error);
    return 0;
  }
};

// Add helper to clean up synced transactions
export const cleanSyncedTransactions = async (): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }

    const transaction = db.transaction(["transactions"], "readwrite");
    const store = transaction.objectStore("transactions");
    const index = store.index("_synced");
    const request = index.openCursor(IDBKeyRange.only(true));
    
    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        deletedCount++;
        cursor.continue();
      } else {
        console.log(`Removed ${deletedCount} synced transactions from offline storage`);
        resolve(deletedCount);
      }
    };

    request.onerror = (event) => {
      console.error("Error cleaning synced transactions:", event);
      reject(new Error("Error cleaning transactions"));
    };
  });
};

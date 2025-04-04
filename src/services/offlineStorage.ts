
// Handle offline storage for the application
import { supabase } from '@/integrations/supabase/client';

// Database names and object stores
const DB_NAME = 'expendx_offline';
const TRANSACTIONS_STORE = 'transactions';
const PENDING_TRANSACTIONS_STORE = 'pending_transactions';

// IndexedDB setup
let db: IDBDatabase | null = null;

// Initialize the database
export const initializeDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      console.error('IndexedDB not supported in this browser');
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      console.info('IndexedDB initialized successfully');
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create transactions store
      if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
        db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' });
      }

      // Create pending transactions store (for offline changes)
      if (!db.objectStoreNames.contains(PENDING_TRANSACTIONS_STORE)) {
        db.createObjectStore(PENDING_TRANSACTIONS_STORE, { keyPath: 'id' });
      }
    };
  });
};

// Add a transaction to the offline store
export const addTransaction = (transaction: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const tx = db.transaction(TRANSACTIONS_STORE, 'readwrite');
    const store = tx.objectStore(TRANSACTIONS_STORE);

    // Generate a temporary ID if not present
    if (!transaction.id) {
      transaction.id = crypto.randomUUID();
    }

    const request = store.add(transaction);

    request.onsuccess = () => {
      resolve(transaction.id);
    };

    request.onerror = (event) => {
      console.error('Error adding transaction to offline store:', event);
      reject(new Error('Failed to store transaction offline'));
    };
  });
};

// Queue a transaction for synchronization when online
export const queueTransactionForSync = (transaction: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const tx = db.transaction(PENDING_TRANSACTIONS_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_TRANSACTIONS_STORE);

    // Ensure we have an ID
    if (!transaction.id) {
      transaction.id = crypto.randomUUID();
    }

    const request = store.put(transaction);

    request.onsuccess = () => {
      // Try to sync immediately if we're online
      if (navigator.onLine) {
        trySync().then(() => resolve()).catch(() => resolve());
      } else {
        resolve();
      }
    };

    request.onerror = (event) => {
      console.error('Error queuing transaction for sync:', event);
      reject(new Error('Failed to queue transaction for sync'));
    };
  });
};

// Attempt to synchronize pending transactions
export const trySync = async (): Promise<void> => {
  if (!db || !navigator.onLine) {
    return;
  }

  const pendingTransactions = await getPendingTransactions();
  if (pendingTransactions.length === 0) {
    return;
  }

  // Get user session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    console.log('Not logged in, can\'t sync transactions');
    return;
  }

  const userId = session.user.id;

  // Process each pending transaction
  for (const transaction of pendingTransactions) {
    try {
      // Ensure we have the user ID
      if (!transaction.user_id) {
        transaction.user_id = userId;
      }

      // Insert into Supabase
      const { error } = await supabase
        .from('transactions')
        .insert({
          ...transaction,
          user_id: userId,  // Ensure user_id is set properly
        });

      if (error) {
        console.error('Error syncing transaction:', error);
      } else {
        // Remove from pending store if successful
        await removePendingTransaction(transaction.id);
      }
    } catch (err) {
      console.error('Error during sync:', err);
    }
  }
};

// Get all pending transactions
const getPendingTransactions = (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const tx = db.transaction(PENDING_TRANSACTIONS_STORE, 'readonly');
    const store = tx.objectStore(PENDING_TRANSACTIONS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error('Error getting pending transactions:', event);
      reject(new Error('Failed to get pending transactions'));
    };
  });
};

// Remove a pending transaction
const removePendingTransaction = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const tx = db.transaction(PENDING_TRANSACTIONS_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_TRANSACTIONS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      console.error('Error removing pending transaction:', event);
      reject(new Error('Failed to remove pending transaction'));
    };
  });
};

// Set up sync events
export const setupSyncEvents = () => {
  // Setup online/offline event listeners
  window.addEventListener('online', () => {
    console.log('App is online, attempting to sync');
    trySync().catch(err => console.error('Sync failed:', err));
  });

  // Register sync event with service worker (if supported)
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then(registration => {
        // For newer browsers that support Background Sync API
        // Note: We don't use sync property directly as it might not be supported
        // and we handle the sync process manually
        console.log('Service worker is ready for sync');
      })
      .catch(err => console.error('Service worker sync registration failed:', err));
  }
};

// Get all stored transactions
export const getAllTransactions = (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const tx = db.transaction(TRANSACTIONS_STORE, 'readonly');
    const store = tx.objectStore(TRANSACTIONS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error('Error getting all transactions:', event);
      reject(new Error('Failed to get transactions'));
    };
  });
};

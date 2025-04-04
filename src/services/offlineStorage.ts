
import { Transaction } from '@/types/transactions';

const DB_NAME = 'expendxOfflineDB';
const DB_VERSION = 1;
const TRANSACTION_STORE = 'offlineTransactions';
const BUDGET_STORE = 'offlineBudgets';

let db: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database for offline storage
 */
export const initializeDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve();
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(TRANSACTION_STORE)) {
        const store = db.createObjectStore(TRANSACTION_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('type', 'data.type', { unique: false });
        store.createIndex('category', 'data.category', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(BUDGET_STORE)) {
        const store = db.createObjectStore(BUDGET_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('category', 'data.category', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      console.log('IndexedDB initialized successfully');
      resolve();
    };

    request.onerror = (event) => {
      console.error('Error initializing IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

/**
 * Store a transaction for offline use
 */
export const storeOfflineTransaction = async (
  transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'user_id'>,
  authToken: string
): Promise<void> => {
  await initializeDB();
  
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const tx = db.transaction(TRANSACTION_STORE, 'readwrite');
    const store = tx.objectStore(TRANSACTION_STORE);
    
    const request = store.add({
      data: transaction,
      authToken,
      synced: 0,
      createdAt: new Date().toISOString()
    });
    
    request.onsuccess = () => {
      console.log('Transaction saved for offline use');
      
      // Trigger background sync if available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
          registration.sync.register('sync-transactions')
            .catch(err => console.error('Background sync registration failed:', err));
        });
      }
      
      resolve();
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * Get all unsynced transactions
 */
export const getUnsyncedTransactions = async (): Promise<any[]> => {
  await initializeDB();
  
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const tx = db.transaction(TRANSACTION_STORE, 'readonly');
    const store = tx.objectStore(TRANSACTION_STORE);
    const index = store.index('synced');
    const request = index.getAll(0); // 0 means not synced
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * Mark a transaction as synced
 */
export const markTransactionSynced = async (id: number): Promise<void> => {
  await initializeDB();
  
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const tx = db.transaction(TRANSACTION_STORE, 'readwrite');
    const store = tx.objectStore(TRANSACTION_STORE);
    const request = store.get(id);
    
    request.onsuccess = () => {
      const data = request.result;
      data.synced = 1;
      
      const updateRequest = store.put(data);
      updateRequest.onsuccess = () => {
        resolve();
      };
      
      updateRequest.onerror = () => {
        reject(updateRequest.error);
      };
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * Get all local transactions (both synced and unsynced)
 */
export const getAllLocalTransactions = async (): Promise<any[]> => {
  await initializeDB();
  
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    const tx = db.transaction(TRANSACTION_STORE, 'readonly');
    const store = tx.objectStore(TRANSACTION_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * Sync all offline transactions to the server
 */
export const syncOfflineTransactions = async (apiUpload: (data: any) => Promise<any>): Promise<void> => {
  const unsynced = await getUnsyncedTransactions();
  
  for (const item of unsynced) {
    try {
      await apiUpload(item.data);
      await markTransactionSynced(item.id);
    } catch (error) {
      console.error('Failed to sync transaction:', error);
    }
  }
};

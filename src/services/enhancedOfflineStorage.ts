import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types/transactions';
import { syncManager } from './syncManager';

// Database names and object stores
const DB_NAME = 'expendx_offline_v2';
const TRANSACTIONS_STORE = 'transactions';
const METADATA_STORE = 'metadata';

// Enhanced IndexedDB setup with better performance
let db: IDBDatabase | null = null;

export const initializeEnhancedDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      console.error('IndexedDB not supported in this browser');
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, 2);

    request.onerror = () => {
      console.error('Enhanced IndexedDB error:', request.error);
      reject(new Error('Failed to open enhanced database'));
    };

    request.onsuccess = () => {
      db = request.result;
      console.info('Enhanced IndexedDB initialized successfully');
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create enhanced transactions store with indexes
      if (!database.objectStoreNames.contains(TRANSACTIONS_STORE)) {
        const transactionStore = database.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' });
        transactionStore.createIndex('user_id', 'user_id', { unique: false });
        transactionStore.createIndex('date', 'date', { unique: false });
        transactionStore.createIndex('type', 'type', { unique: false });
        transactionStore.createIndex('category', 'category', { unique: false });
        transactionStore.createIndex('last_modified', 'last_modified', { unique: false });
      }

      // Create metadata store for sync information
      if (!database.objectStoreNames.contains(METADATA_STORE)) {
        database.createObjectStore(METADATA_STORE, { keyPath: 'key' });
      }
    };
  });
};

// Enhanced transaction operations with conflict detection
export const addTransactionEnhanced = async (transaction: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Enhanced database not initialized'));
      return;
    }

    const tx = db.transaction([TRANSACTIONS_STORE, METADATA_STORE], 'readwrite');
    const transactionStore = tx.objectStore(TRANSACTIONS_STORE);
    const metadataStore = tx.objectStore(METADATA_STORE);

    // Add timestamp metadata
    const enhancedTransaction = {
      ...transaction,
      id: transaction.id || crypto.randomUUID(),
      last_modified: Date.now(),
      client_created: true
    };

    const request = transactionStore.add(enhancedTransaction);

    request.onsuccess = () => {
      // Update metadata
      metadataStore.put({
        key: 'last_local_change',
        value: Date.now()
      });

      // Add to sync queue
      syncManager.addToSyncQueue({
        type: 'INSERT',
        table: 'transactions',
        data: enhancedTransaction
      });

      resolve(enhancedTransaction.id);
    };

    request.onerror = () => {
      console.error('Error adding enhanced transaction:', request.error);
      reject(new Error('Failed to store enhanced transaction'));
    };
  });
};

export const updateTransactionEnhanced = async (transaction: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Enhanced database not initialized'));
      return;
    }

    const tx = db.transaction([TRANSACTIONS_STORE, METADATA_STORE], 'readwrite');
    const transactionStore = tx.objectStore(TRANSACTIONS_STORE);
    const metadataStore = tx.objectStore(METADATA_STORE);

    // Get existing transaction to check for conflicts
    const getRequest = transactionStore.get(transaction.id);

    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      
      // Simple conflict detection based on last_modified timestamp
      if (existing && existing.server_last_modified && 
          existing.server_last_modified > (transaction.last_modified || 0)) {
        console.warn('Conflict detected for transaction:', transaction.id);
        // For now, server wins - but this could be enhanced with merge strategies
      }

      const updatedTransaction = {
        ...existing,
        ...transaction,
        last_modified: Date.now()
      };

      const updateRequest = transactionStore.put(updatedTransaction);

      updateRequest.onsuccess = () => {
        // Update metadata
        metadataStore.put({
          key: 'last_local_change',
          value: Date.now()
        });

        // Add to sync queue
        syncManager.addToSyncQueue({
          type: 'UPDATE',
          table: 'transactions',
          data: updatedTransaction
        });

        resolve();
      };

      updateRequest.onerror = () => {
        reject(new Error('Failed to update enhanced transaction'));
      };
    };

    getRequest.onerror = () => {
      reject(new Error('Failed to retrieve transaction for update'));
    };
  });
};

// Optimized bulk operations
export const batchUpdateTransactionsEnhanced = async (transactions: any[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Enhanced database not initialized'));
      return;
    }

    const tx = db.transaction([TRANSACTIONS_STORE, METADATA_STORE], 'readwrite');
    const transactionStore = tx.objectStore(TRANSACTIONS_STORE);
    const metadataStore = tx.objectStore(METADATA_STORE);

    let completed = 0;
    const total = transactions.length;

    if (total === 0) {
      resolve();
      return;
    }

    // Add server metadata to distinguish from local changes
    const enhancedTransactions = transactions.map(t => ({
      ...t,
      server_last_modified: Date.now(),
      client_created: false
    }));

    enhancedTransactions.forEach(transaction => {
      const request = transactionStore.put(transaction);

      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          // Update sync metadata
          metadataStore.put({
            key: 'last_server_sync',
            value: Date.now()
          });
          resolve();
        }
      };

      request.onerror = () => {
        console.error('Error in batch update:', request.error);
        reject(new Error('Failed during enhanced batch update'));
      };
    });
  });
};

// Optimized query methods with indexes
export const getTransactionsByDateRange = async (startDate: string, endDate: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Enhanced database not initialized'));
      return;
    }

    const tx = db.transaction(TRANSACTIONS_STORE, 'readonly');
    const store = tx.objectStore(TRANSACTIONS_STORE);
    const index = store.index('date');
    
    const range = IDBKeyRange.bound(startDate, endDate);
    const request = index.getAll(range);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to query transactions by date range'));
    };
  });
};

export const getTransactionsByCategory = async (category: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Enhanced database not initialized'));
      return;
    }

    const tx = db.transaction(TRANSACTIONS_STORE, 'readonly');
    const store = tx.objectStore(TRANSACTIONS_STORE);
    const index = store.index('category');
    
    const request = index.getAll(category);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to query transactions by category'));
    };
  });
};

// Performance optimization: Get cached count without loading all data
export const getTransactionCount = async (): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Enhanced database not initialized'));
      return;
    }

    const tx = db.transaction(TRANSACTIONS_STORE, 'readonly');
    const store = tx.objectStore(TRANSACTIONS_STORE);
    const request = store.count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to get transaction count'));
    };
  });
};

// Clean up old data to prevent storage bloat
export const cleanupOldData = async (daysToKeep: number = 90): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Enhanced database not initialized'));
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateString = cutoffDate.toISOString().split('T')[0];

    const tx = db.transaction(TRANSACTIONS_STORE, 'readwrite');
    const store = tx.objectStore(TRANSACTIONS_STORE);
    const index = store.index('date');
    
    const range = IDBKeyRange.upperBound(cutoffDateString, true);
    const request = index.openCursor(range);

    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        // Only delete server-synced transactions, keep local ones
        if (!cursor.value.client_created) {
          cursor.delete();
          deletedCount++;
        }
        cursor.continue();
      } else {
        console.log(`Cleanup completed: deleted ${deletedCount} old transactions`);
        resolve();
      }
    };

    request.onerror = () => {
      reject(new Error('Failed to cleanup old data'));
    };
  });
};

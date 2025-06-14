import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types/transactions';

// Database names and object stores
const DB_NAME = 'expendx_offline_complete';
const DB_VERSION = 3;

// Object stores for different data types
const STORES = {
  TRANSACTIONS: 'transactions',
  BUDGETS: 'budget_categories',
  SAVINGS: 'savings_goals',
  PROFILE: 'user_profiles',
  SETTINGS: 'user_settings',
  INCOME: 'monthly_income_estimates',
  CATEGORIES: 'user_categories',
  SYNC_QUEUE: 'sync_queue',
  METADATA: 'metadata'
};

interface SyncQueueItem {
  id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
}

interface DataCacheMetadata {
  lastFullSync: number;
  lastPartialSync: number;
  userId: string;
  version: number;
}

class OfflineDataManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private syncCallbacks: ((status: any) => void)[] = [];
  private currentUserId: string | null = null;

  async initialize(userId: string): Promise<void> {
    if (this.isInitialized && this.currentUserId === userId) {
      return;
    }

    this.currentUserId = userId;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open offline database:', request.error);
        reject(new Error('Failed to initialize offline storage'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('Offline data manager initialized successfully');
        this.performFullDataSync();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.setupObjectStores(db);
      };
    });
  }

  private setupObjectStores(db: IDBDatabase) {
    // Create object stores with appropriate indexes
    Object.values(STORES).forEach(storeName => {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' });
        
        // Add indexes based on store type
        if (storeName === STORES.TRANSACTIONS) {
          store.createIndex('user_id', 'user_id', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('status', 'sync_status', { unique: false });
        } else if (storeName === STORES.SYNC_QUEUE) {
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        } else {
          store.createIndex('user_id', 'user_id', { unique: false });
        }
      }
    });
  }

  // Full data sync - download all user data when online
  async performFullDataSync(): Promise<void> {
    if (!navigator.onLine || !this.currentUserId) {
      return;
    }

    console.log('Starting full data sync for user:', this.currentUserId);

    try {
      // Fetch all user data in parallel
      const [
        transactions,
        budgets,
        savings,
        profile,
        settings,
        income,
        categories
      ] = await Promise.all([
        this.fetchTransactions(),
        this.fetchBudgets(),
        this.fetchSavings(),
        this.fetchProfile(),
        this.fetchSettings(),
        this.fetchIncome(),
        this.fetchCategories()
      ]);

      // Store all data locally
      await Promise.all([
        this.storeDataLocally(STORES.TRANSACTIONS, transactions),
        this.storeDataLocally(STORES.BUDGETS, budgets),
        this.storeDataLocally(STORES.SAVINGS, savings),
        this.storeDataLocally(STORES.PROFILE, profile),
        this.storeDataLocally(STORES.SETTINGS, settings),
        this.storeDataLocally(STORES.INCOME, income),
        this.storeDataLocally(STORES.CATEGORIES, categories)
      ]);

      // Update metadata
      await this.updateMetadata({
        lastFullSync: Date.now(),
        lastPartialSync: Date.now(),
        userId: this.currentUserId,
        version: DB_VERSION
      });

      console.log('Full data sync completed successfully');
      this.notifyStatusChange({ type: 'FULL_SYNC_COMPLETE', timestamp: Date.now() });

    } catch (error) {
      console.error('Full data sync failed:', error);
      this.notifyStatusChange({ type: 'SYNC_ERROR', error: error.message, timestamp: Date.now() });
    }
  }

  // Fetch methods for different data types
  private async fetchTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', this.currentUserId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  private async fetchBudgets() {
    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', this.currentUserId);
    
    if (error) throw error;
    return data || [];
  }

  private async fetchSavings() {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', this.currentUserId);
    
    if (error) throw error;
    return data || [];
  }

  private async fetchProfile() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', this.currentUserId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? [data] : [];
  }

  private async fetchSettings() {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', this.currentUserId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? [data] : [];
  }

  private async fetchIncome() {
    const { data, error } = await supabase
      .from('monthly_income_estimates')
      .select('*')
      .eq('user_id', this.currentUserId);
    
    if (error) throw error;
    return data || [];
  }

  private async fetchCategories() {
    const { data, error } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', this.currentUserId);
    
    if (error) throw error;
    return data || [];
  }

  // Store data locally with timestamp tracking
  private async storeDataLocally(storeName: string, data: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      // Clear existing data for this user
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        let completed = 0;
        const total = data.length;

        if (total === 0) {
          resolve();
          return;
        }

        // Add all data with sync metadata
        data.forEach(item => {
          const enhancedItem = {
            ...item,
            sync_status: 'synced',
            last_synced: Date.now(),
            local_modified: false
          };

          const addRequest = store.add(enhancedItem);
          
          addRequest.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };

          addRequest.onerror = () => {
            reject(new Error(`Failed to store ${storeName} data`));
          };
        });
      };

      clearRequest.onerror = () => {
        reject(new Error(`Failed to clear ${storeName} store`));
      };
    });
  }

  // Add new data with pending sync status
  async addDataOffline(tableName: string, data: any): Promise<string> {
    const id = data.id || crypto.randomUUID();
    const enhancedData = {
      ...data,
      id,
      sync_status: 'pending',
      created_offline: true,
      local_modified: true,
      timestamp: Date.now()
    };

    // Store in appropriate table
    await this.storeItemLocally(tableName, enhancedData);

    // Add to sync queue
    await this.addToSyncQueue({
      id: crypto.randomUUID(),
      operation: 'INSERT',
      table: tableName,
      data: enhancedData,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    });

    // Try immediate sync if online
    if (navigator.onLine) {
      this.processSyncQueue();
    }

    return id;
  }

  // Update existing data with pending sync status
  async updateDataOffline(tableName: string, id: string, updates: any): Promise<void> {
    const existingData = await this.getItemLocally(tableName, id);
    if (!existingData) {
      throw new Error(`Item with id ${id} not found in ${tableName}`);
    }

    const updatedData = {
      ...existingData,
      ...updates,
      sync_status: 'pending',
      local_modified: true,
      last_modified: Date.now()
    };

    await this.storeItemLocally(tableName, updatedData);

    // Add to sync queue
    await this.addToSyncQueue({
      id: crypto.randomUUID(),
      operation: 'UPDATE',
      table: tableName,
      data: updatedData,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    });

    if (navigator.onLine) {
      this.processSyncQueue();
    }
  }

  // Get data from local storage with fallback to cloud
  async getData(tableName: string, filters?: any): Promise<any[]> {
    try {
      // First try to get from local storage
      const localData = await this.getDataLocally(tableName, filters);
      
      // If we have recent local data, use it
      const metadata = await this.getMetadata();
      const isRecentSync = metadata && (Date.now() - metadata.lastPartialSync) < 300000; // 5 minutes
      
      if (localData.length > 0 || !navigator.onLine || isRecentSync) {
        return localData;
      }

      // Otherwise, try to fetch from cloud and update local
      if (navigator.onLine) {
        await this.performFullDataSync();
        return await this.getDataLocally(tableName, filters);
      }

      return localData;
    } catch (error) {
      console.error(`Error getting data from ${tableName}:`, error);
      return [];
    }
  }

  // Helper methods for local storage operations
  private async storeItemLocally(storeName: string, item: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to store item in ${storeName}`));
    });
  }

  private async getItemLocally(storeName: string, id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get item from ${storeName}`));
    });
  }

  private async getDataLocally(storeName: string, filters?: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result || [];
        
        // Apply filters if provided
        if (filters) {
          results = results.filter(item => {
            return Object.keys(filters).every(key => {
              if (filters[key] === undefined) return true;
              return item[key] === filters[key];
            });
          });
        }

        resolve(results);
      };

      request.onerror = () => reject(new Error(`Failed to get data from ${storeName}`));
    });
  }

  // Sync queue management
  private async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    return this.storeItemLocally(STORES.SYNC_QUEUE, item);
  }

  async processSyncQueue(): Promise<void> {
    if (!navigator.onLine) {
      return;
    }

    const pendingItems = await this.getDataLocally(STORES.SYNC_QUEUE, { status: 'pending' });
    
    for (const item of pendingItems) {
      try {
        await this.syncItem(item);
        
        // Update item status to completed
        await this.storeItemLocally(STORES.SYNC_QUEUE, {
          ...item,
          status: 'completed',
          synced_at: Date.now()
        });

        this.notifyStatusChange({ 
          type: 'ITEM_SYNCED', 
          table: item.table, 
          operation: item.operation,
          timestamp: Date.now() 
        });

      } catch (error) {
        console.error('Failed to sync item:', item, error);
        
        // Update retry count and status
        const updatedItem = {
          ...item,
          retryCount: item.retryCount + 1,
          status: item.retryCount >= 3 ? 'failed' : 'pending',
          last_error: error.message,
          last_attempt: Date.now()
        };

        await this.storeItemLocally(STORES.SYNC_QUEUE, updatedItem);
      }
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const { operation, table, data } = item;

    // Remove local-only metadata before syncing
    const cleanData = { ...data };
    delete cleanData.sync_status;
    delete cleanData.created_offline;
    delete cleanData.local_modified;
    delete cleanData.timestamp;
    delete cleanData.last_synced;
    delete cleanData.last_modified;

    switch (operation) {
      case 'INSERT':
        const { error: insertError } = await supabase
          .from(table)
          .insert(cleanData);
        if (insertError) throw insertError;
        break;

      case 'UPDATE':
        const { error: updateError } = await supabase
          .from(table)
          .update(cleanData)
          .eq('id', data.id);
        if (updateError) throw updateError;
        break;

      case 'DELETE':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;
    }

    // Update local item to mark as synced
    await this.storeItemLocally(table, {
      ...data,
      sync_status: 'synced',
      local_modified: false,
      last_synced: Date.now()
    });
  }

  // Metadata management
  private async updateMetadata(metadata: DataCacheMetadata): Promise<void> {
    return this.storeItemLocally(STORES.METADATA, {
      id: 'cache_metadata',
      ...metadata
    });
  }

  private async getMetadata(): Promise<DataCacheMetadata | null> {
    try {
      return await this.getItemLocally(STORES.METADATA, 'cache_metadata');
    } catch {
      return null;
    }
  }

  // Status change notifications
  onStatusChange(callback: (status: any) => void) {
    this.syncCallbacks.push(callback);
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyStatusChange(status: any) {
    this.syncCallbacks.forEach(callback => callback(status));
  }

  // Get sync status for UI indicators
  async getSyncStatus(): Promise<any> {
    const pendingCount = (await this.getDataLocally(STORES.SYNC_QUEUE, { status: 'pending' })).length;
    const failedCount = (await this.getDataLocally(STORES.SYNC_QUEUE, { status: 'failed' })).length;
    const metadata = await this.getMetadata();

    return {
      isOnline: navigator.onLine,
      pendingCount,
      failedCount,
      lastSync: metadata?.lastFullSync,
      hasUnsynced: pendingCount > 0 || failedCount > 0
    };
  }

  // Progressive backup - save state periodically
  startProgressiveBackup() {
    // Save state every 30 seconds
    setInterval(() => {
      if (this.isInitialized) {
        this.performPartialSync();
      }
    }, 30000);

    // Save on page unload
    window.addEventListener('beforeunload', () => {
      this.performPartialSync();
    });
  }

  private async performPartialSync() {
    if (!navigator.onLine) return;

    try {
      // Only sync recent changes
      const metadata = await this.getMetadata();
      const lastSync = metadata?.lastPartialSync || 0;
      
      // Get items modified since last partial sync
      const modifiedItems = await this.getDataLocally(STORES.TRANSACTIONS, { local_modified: true });
      
      if (modifiedItems.length > 0) {
        await this.processSyncQueue();
        await this.updateMetadata({
          ...metadata,
          lastPartialSync: Date.now()
        });
      }
    } catch (error) {
      console.error('Partial sync failed:', error);
    }
  }
}

// Export singleton instance
export const offlineDataManager = new OfflineDataManager();

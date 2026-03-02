import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionType } from '@/types/transactions';

// Enhanced offline storage with full data caching
const CACHE_VERSION = '1.0';
const CACHE_PREFIX = 'expendx_cache_';
const SYNC_QUEUE_KEY = 'expendx_sync_queue';
const LAST_SYNC_KEY = 'expendx_last_sync';

export interface CachedData {
  transactions: Transaction[];
  budgets: any[];
  savings: any[];
  profile: any;
  settings: any;
  timestamp: number;
  version: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  tempId?: string;
  lastSyncedAt?: number;
}

class EnhancedOfflineManager {
  private syncQueue: SyncQueueItem[] = [];
  private isOnline = navigator.onLine;
  private isSyncing = false;
  private syncStatusCallbacks: ((status: any) => void)[] = [];
  private dataCache: CachedData | null = null;
  private cachedUserId: string | null = null;

  constructor() {
    this.initializeManager();
    this.setupNetworkListeners();

    // Keep cached user id in sync with auth state
    supabase.auth.onAuthStateChange((_event, session) => {
      this.cachedUserId = session?.user?.id ?? null;
      try {
        if (this.cachedUserId) {
          localStorage.setItem('cached_user_id', this.cachedUserId);
        } else {
          localStorage.removeItem('cached_user_id');
        }
      } catch { }
    });

    this.startPeriodicSync();
  }

  private async initializeManager() {
    await this.loadSyncQueue();
    await this.loadDataCache();

    if (this.isOnline) {
      await this.performFullDataSync();
    }
  }

  private setupNetworkListeners() {
    window.addEventListener('online', async () => {
      console.log('Network: Back online, starting sync');
      this.isOnline = true;
      this.notifyStatusChange();
      await this.performFullDataSync();
    });

    window.addEventListener('offline', () => {
      console.log('Network: Gone offline');
      this.isOnline = false;
      this.notifyStatusChange();
    });
  }

  private startPeriodicSync() {
    setInterval(async () => {
      if (this.isOnline && this.syncQueue.length > 0 && !this.isSyncing) {
        await this.processSyncQueue();
      }
    }, 30000); // Sync every 30 seconds
  }

  private async getCurrentUserId(): Promise<string> {
    if (this.cachedUserId) return this.cachedUserId;

    try {
      // 1. Try localStorage first
      const cached = localStorage.getItem('cached_user_id');
      if (cached) {
        this.cachedUserId = cached;
        return cached;
      }

      // Add timeout for auth checks
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('User ID retrieval timed out')), 10000); // 10s timeout
      });

      // 2. Try auth session (snappier than getUser)
      const sessionPromise = supabase.auth.getSession();
      const { data: { session } } = await (Promise.race([sessionPromise, timeoutPromise]) as any);

      if (session?.user) {
        this.cachedUserId = session.user.id;
        localStorage.setItem('cached_user_id', session.user.id);
        return session.user.id;
      }

      // 3. Last resort - get user (expensive)
      const userPromise = supabase.auth.getUser();
      const { data: { user } } = await (Promise.race([userPromise, timeoutPromise]) as any);

      if (user) {
        this.cachedUserId = user.id;
        localStorage.setItem('cached_user_id', user.id);
        return user.id;
      }
    } catch (error) {
      console.warn('Failed to retrieve user ID for sync:', error);
    }

    throw new Error('No authenticated user for offline operations');
  }

  // Full data download and caching
  async performFullDataSync(): Promise<void> {
    if (!this.isOnline || this.isSyncing) return;

    this.isSyncing = true;
    this.notifyStatusChange();

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Full data sync timed out')), 30000); // 30s total timeout
      });

      const userId = await this.getCurrentUserId();

      console.log('Starting full data sync for user:', userId);

      // Fetch all user data in parallel
      const syncPromise = Promise.all([
        this.fetchTransactions(userId),
        this.fetchBudgets(userId),
        this.fetchSavings(userId),
        this.fetchProfile(userId),
        this.fetchSettings(userId)
      ]);

      const [transactions, budgets, savings, profile, settings] = await (Promise.race([syncPromise, timeoutPromise]) as any);

      // Update local cache with properly typed transactions
      this.dataCache = {
        transactions: transactions || [],
        budgets: budgets || [],
        savings: savings || [],
        profile: profile || null,
        settings: settings || null,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };

      await this.saveDataCache();

      // Process any pending sync items
      await this.processSyncQueue();

      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      console.log('Full data sync completed successfully');

    } catch (error) {
      console.error('Full data sync failed:', error);
    } finally {
      this.isSyncing = false;
      this.notifyStatusChange();
    }
  }

  private async fetchTransactions(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('archived', false)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(item => ({
      ...item,
      type: item.type as TransactionType
    }));
  }

  private async fetchBudgets(userId: string) {
    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }

  private async fetchSavings(userId: string) {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }

  private async fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  private async fetchSettings(userId: string) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Local data access methods with sync status
  getTransactions(filters?: any): Transaction[] {
    if (!this.dataCache) return [];

    let transactions = this.dataCache.transactions;

    // Apply filters if provided
    if (filters) {
      if (filters.type && filters.type !== 'all') {
        transactions = transactions.filter(t => t.type === filters.type);
      }
      if (filters.startDate) {
        transactions = transactions.filter(t => t.date >= filters.startDate);
      }
      if (filters.endDate) {
        transactions = transactions.filter(t => t.date <= filters.endDate);
      }
      if (filters.category && filters.category !== 'All') {
        transactions = transactions.filter(t => t.category === filters.category);
      }
      if (filters.includeArchived !== true) {
        transactions = transactions.filter(t => !t.archived);
      }
    } else {
      // Default: exclude archived
      transactions = transactions.filter(t => !t.archived);
    }

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Get summary of all transactions (for balance calculations)
  getTransactionSummary(): { totalCredits: number; totalDebits: number; totalSavings: number; balance: number } {
    if (!this.dataCache) return { totalCredits: 0, totalDebits: 0, totalSavings: 0, balance: 0 };

    const transactions = this.dataCache.transactions.filter(t => !t.archived);

    const totalCredits = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebits = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSavings = transactions
      .filter(t => t.type === 'savings')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalCredits,
      totalDebits,
      totalSavings,
      balance: totalCredits - totalDebits - totalSavings
    };
  }

  getBudgets(): any[] {
    return this.dataCache?.budgets || [];
  }

  getSavings(): any[] {
    return this.dataCache?.savings || [];
  }

  getProfile(): any {
    return this.dataCache?.profile;
  }

  getSettings(): any {
    return this.dataCache?.settings;
  }

  // Enhanced offline operations - ONLY queue when offline
  async addTransactionOffline(transactionData: Omit<Transaction, 'id'>): Promise<string> {
    // If online, save directly to database
    if (this.isOnline) {
      return await this.addTransactionOnline(transactionData);
    }

    // If offline, use offline queue system
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const transaction: Transaction = {
      ...transactionData,
      id: tempId
    };

    // Add to local cache immediately
    if (this.dataCache) {
      this.dataCache.transactions.unshift(transaction);
      await this.saveDataCache();
    }

    // Add to sync queue for when we're back online
    await this.addToSyncQueue({
      type: 'INSERT',
      table: 'transactions',
      data: transactionData,
      tempId,
      status: 'pending'
    });

    console.log('Transaction queued offline with temp ID:', tempId);
    return tempId;
  }

  private async addTransactionOnline(transactionData: Omit<Transaction, 'id'>): Promise<string> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...transactionData, user_id: userId })
      .select()
      .single();

    if (error) throw error;

    // Update local cache with the new transaction
    if (this.dataCache) {
      const newTransaction = {
        ...data,
        type: data.type as TransactionType
      };
      this.dataCache.transactions.unshift(newTransaction);
      await this.saveDataCache();
    }

    console.log('Transaction saved online:', data.id);
    return data.id;
  }

  async updateTransactionOffline(id: string, updates: Partial<Transaction>): Promise<void> {
    // If online, update directly in database
    if (this.isOnline) {
      return await this.updateTransactionOnline(id, updates);
    }

    // If offline, use offline queue system
    if (this.dataCache) {
      const index = this.dataCache.transactions.findIndex(t => t.id === id);
      if (index !== -1) {
        this.dataCache.transactions[index] = {
          ...this.dataCache.transactions[index],
          ...updates
        };
        await this.saveDataCache();
      }
    }

    await this.addToSyncQueue({
      type: 'UPDATE',
      table: 'transactions',
      data: { id, ...updates },
      status: 'pending'
    });
  }

  private async updateTransactionOnline(id: string, updates: Partial<Transaction>): Promise<void> {
    const userId = await this.getCurrentUserId();

    const { error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    // Update local cache
    if (this.dataCache) {
      const index = this.dataCache.transactions.findIndex(t => t.id === id);
      if (index !== -1) {
        this.dataCache.transactions[index] = {
          ...this.dataCache.transactions[index],
          ...updates
        };
        await this.saveDataCache();
      }
    }

    console.log('Transaction updated online:', id);
  }

  async deleteTransactionOffline(id: string): Promise<void> {
    // If online, delete directly from database
    if (this.isOnline) {
      return await this.deleteTransactionOnline(id);
    }

    // If offline, use offline queue system
    if (this.dataCache) {
      this.dataCache.transactions = this.dataCache.transactions.filter(t => t.id !== id);
      await this.saveDataCache();
    }

    // Only queue if not a temp ID
    if (!id.startsWith('temp_')) {
      await this.addToSyncQueue({
        type: 'DELETE',
        table: 'transactions',
        data: { id },
        status: 'pending'
      });
    } else {
      // Remove temp transaction from sync queue if it exists
      this.syncQueue = this.syncQueue.filter(item =>
        !(item.tempId === id || (item.data && item.data.id === id))
      );
      await this.saveSyncQueue();
    }
  }

  private async deleteTransactionOnline(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    // Remove from local cache
    if (this.dataCache) {
      this.dataCache.transactions = this.dataCache.transactions.filter(t => t.id !== id);
      await this.saveDataCache();
    }

    console.log('Transaction deleted online:', id);
  }

  // Enhanced sync queue management with better retry logic
  private async addToSyncQueue(operation: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) {
    const queueItem: SyncQueueItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
      ...operation
    };

    this.syncQueue.push(queueItem);
    await this.saveSyncQueue();
    this.notifyStatusChange();

    // Try immediate sync if online
    if (this.isOnline && !this.isSyncing) {
      setTimeout(() => this.processSyncQueue(), 1000);
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) return;

    this.isSyncing = true;
    this.notifyStatusChange();

    // Sort queue by timestamp to maintain order
    const pendingItems = this.syncQueue
      .filter(item => item.status === 'pending')
      .sort((a, b) => a.timestamp - b.timestamp);

    console.log(`Processing ${pendingItems.length} pending sync items`);

    for (const item of pendingItems) {
      try {
        item.status = 'syncing';
        await this.syncItem(item);

        // Mark as synced and set sync timestamp
        item.status = 'synced';
        item.lastSyncedAt = Date.now();

        console.log(`Successfully synced ${item.type} ${item.table}`);

      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        item.status = 'failed';
        item.retryCount++;

        // Remove item if max retries exceeded
        if (item.retryCount >= 3) {
          console.log(`Removed item ${item.id} after max retries`);
        }
      }
    }

    // Clean up successfully synced items
    this.syncQueue = this.syncQueue.filter(item =>
      item.status !== 'synced' && item.retryCount < 3
    );

    await this.saveSyncQueue();
    this.isSyncing = false;
    this.notifyStatusChange();
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const { type, table, data } = item;

    switch (table) {
      case 'transactions':
        await this.syncTransaction(type, data, item);
        break;
      default:
        // Generic handler for other tables (budget_categories, savings_goals, subscriptions, etc.)
        await this.syncGenericItem(type, table, data, item);
        break;
    }
  }

  private async syncGenericItem(type: string, table: string, data: any, item: SyncQueueItem): Promise<void> {
    switch (type) {
      case 'INSERT': {
        const insertData = { ...data };
        // Remove temp IDs for insert
        if (item.tempId && insertData.id === item.tempId) {
          delete insertData.id;
        }
        const { error } = await supabase.from(table as any).insert(insertData);
        if (error) throw error;
        break;
      }
      case 'UPDATE': {
        if (!data.id) throw new Error(`Cannot update ${table}: missing id`);
        const { id, ...updateFields } = data;
        const { error } = await supabase.from(table as any).update(updateFields).eq('id', id);
        if (error) throw error;
        break;
      }
      case 'DELETE': {
        if (!data.id) throw new Error(`Cannot delete from ${table}: missing id`);
        const { error } = await supabase.from(table as any).delete().eq('id', data.id);
        if (error) throw error;
        break;
      }
      default:
        console.warn(`Unknown sync operation type: ${type} for table: ${table}`);
    }
  }

  private async syncTransaction(type: string, data: any, item: SyncQueueItem): Promise<void> {
    const userId = await this.getCurrentUserId();

    switch (type) {
      case 'INSERT':
        const { data: insertedData, error: insertError } = await supabase
          .from('transactions')
          .insert({ ...data, user_id: userId })
          .select()
          .single();

        if (insertError) throw insertError;

        // Update local cache with real ID and properly cast the type
        if (this.dataCache && item.tempId) {
          const tempIndex = this.dataCache.transactions.findIndex(t => t.id === item.tempId);
          if (tempIndex !== -1) {
            this.dataCache.transactions[tempIndex] = {
              ...insertedData,
              type: insertedData.type as TransactionType
            };
            await this.saveDataCache();
          }
        }
        break;

      case 'UPDATE':
        const { error: updateError } = await supabase
          .from('transactions')
          .update(data)
          .eq('id', data.id)
          .eq('user_id', userId);

        if (updateError) throw updateError;
        break;

      case 'DELETE':
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', data.id)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;
        break;

      default:
        throw new Error(`Unsupported sync type: ${type}`);
    }
  }

  // Storage methods using IndexedDB for large payloads
  private async getDB(): Promise<IDBDatabase> {
    const DB_NAME = 'expendx_offline';
    const DB_VERSION = 2; // Increment version to ensure clean upgrade for consolidated stores
    const TRANSACTIONS_STORE = 'transactions';
    const PENDING_CHANGES_STORE = 'pending_changes';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create transactions store for cached data
        if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
          db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' });
        }

        // Create pending changes store for offline sync (replacing/augmenting syncQueue)
        if (!db.objectStoreNames.contains(PENDING_CHANGES_STORE)) {
          db.createObjectStore(PENDING_CHANGES_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  private async saveDataCache(): Promise<void> {
    try {
      if (!this.dataCache) return;

      // 1. Save metadata to localStorage (fast)
      const { transactions, ...metadata } = this.dataCache;
      localStorage.setItem(`${CACHE_PREFIX}metadata`, JSON.stringify(metadata));

      // 2. Save transactions to IndexedDB (asynchronous, high capacity)
      const db = await this.getDB();
      const tx = db.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');

      // Efficiently sync the store with the current transactions array
      // Instead of clearing every time (which can be heavy), we'll do a batch update
      // But for "Full Data Sync", clearing is often simpler to ensure no stale data
      await new Promise<void>((resolve, reject) => {
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });

      // Batch add items efficiently
      for (const t of transactions) {
        store.put(t);
      }

      return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => {
          console.log(`Successfully saved ${transactions.length} transactions to IndexedDB`);
          resolve();
        };
        tx.onerror = () => {
          console.error('IndexedDB transaction failed:', tx.error);
          reject(tx.error);
        };
      });
    } catch (error) {
      console.error('Failed to save data cache to IndexedDB:', error);
    }
  }

  private async loadDataCache(): Promise<void> {
    try {
      // 1. Load metadata
      const metaStr = localStorage.getItem(`${CACHE_PREFIX}metadata`);
      if (!metaStr) {
        this.dataCache = null;
        return;
      }

      const metadata = JSON.parse(metaStr);

      // 2. Load transactions from IndexedDB
      const db = await this.getDB();
      const tx = db.transaction('transactions', 'readonly');
      const store = tx.objectStore('transactions');

      const transactions = await new Promise<Transaction[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      this.dataCache = {
        ...metadata,
        transactions: transactions || []
      };

      console.log('Loaded data cache from IndexedDB:', this.dataCache?.transactions?.length, 'transactions');
    } catch (error) {
      console.error('Failed to load data cache from IndexedDB:', error);
      this.dataCache = null;
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error: any) {
      // Handle quota exceeded by clearing cache to make space for the queue (priority)
      if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn('LocalStorage quota exceeded. Clearing cache to save sync queue.');
        try {
          // Clear large data caches to free space
          localStorage.removeItem(`${CACHE_PREFIX}data`);
          this.dataCache = null;
          // Retry saving queue
          localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
          console.log('Successfully saved sync queue after clearing cache');
        } catch (retryError) {
          console.error('Failed to save sync queue even after clearing cache:', retryError);
        }
      } else {
        console.error('Failed to save sync queue:', error);
      }
    }
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        console.log(`Loaded ${this.syncQueue.length} items from sync queue`);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  // Status and callbacks
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      queueCount: this.syncQueue.filter(item => item.status === 'pending').length,
      failedCount: this.syncQueue.filter(item => item.status === 'failed').length,
      lastSync: localStorage.getItem(LAST_SYNC_KEY) ? new Date(parseInt(localStorage.getItem(LAST_SYNC_KEY)!)) : null,
      hasData: !!this.dataCache,
      syncQueue: this.syncQueue
    };
  }

  onStatusChange(callback: (status: any) => void) {
    this.syncStatusCallbacks.push(callback);
    return () => {
      this.syncStatusCallbacks = this.syncStatusCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyStatusChange() {
    const status = this.getSyncStatus();
    this.syncStatusCallbacks.forEach(callback => callback(status));
  }

  // Force sync method
  async forceSync(): Promise<void> {
    await this.performFullDataSync();
  }

  // Clear sync queue
  clearSyncQueue(): void {
    this.syncQueue = [];
    this.saveSyncQueue();
    this.notifyStatusChange();
  }

  // Check if transaction is pending sync
  isTransactionPending(transactionId: string): boolean {
    if (transactionId.startsWith('temp_')) return true;

    return this.syncQueue.some(item =>
      item.table === 'transactions' &&
      item.status === 'pending' &&
      (item.data.id === transactionId || item.tempId === transactionId)
    );
  }

  isTransactionSyncing(transactionId: string): boolean {
    return this.syncQueue.some(item =>
      item.table === 'transactions' &&
      item.status === 'syncing' &&
      (item.data.id === transactionId || item.tempId === transactionId)
    );
  }

  isTransactionFailed(transactionId: string): boolean {
    return this.syncQueue.some(item =>
      item.table === 'transactions' &&
      item.status === 'failed' &&
      (item.data.id === transactionId || item.tempId === transactionId)
    );
  }

  // Get cached data age
  getCacheAge(): number | null {
    if (!this.dataCache) return null;
    return Date.now() - this.dataCache.timestamp;
  }
}

// Export singleton instance
export const enhancedOfflineManager = new EnhancedOfflineManager();

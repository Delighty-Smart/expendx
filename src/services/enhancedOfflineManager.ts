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

  constructor() {
    this.initializeManager();
    this.setupNetworkListeners();
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

  // Full data download and caching
  async performFullDataSync(): Promise<void> {
    if (!this.isOnline || this.isSyncing) return;

    this.isSyncing = true;
    this.notifyStatusChange();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      console.log('Starting full data sync for user:', user.id);

      // Fetch all user data in parallel
      const [transactions, budgets, savings, profile, settings] = await Promise.all([
        this.fetchTransactions(user.id),
        this.fetchBudgets(user.id),
        this.fetchSavings(user.id),
        this.fetchProfile(user.id),
        this.fetchSettings(user.id)
      ]);

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
    }
    
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...transactionData, user_id: user.id })
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id);

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

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
        throw new Error(`Unsupported table: ${table}`);
    }
  }

  private async syncTransaction(type: string, data: any, item: SyncQueueItem): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    switch (type) {
      case 'INSERT':
        const { data: insertedData, error: insertError } = await supabase
          .from('transactions')
          .insert({ ...data, user_id: user.id })
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
          .eq('user_id', user.id);
        
        if (updateError) throw updateError;
        break;

      case 'DELETE':
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', data.id)
          .eq('user_id', user.id);
        
        if (deleteError) throw deleteError;
        break;

      default:
        throw new Error(`Unsupported sync type: ${type}`);
    }
  }

  // Storage methods
  private async saveDataCache(): Promise<void> {
    try {
      if (this.dataCache) {
        localStorage.setItem(`${CACHE_PREFIX}data`, JSON.stringify(this.dataCache));
      }
    } catch (error) {
      console.error('Failed to save data cache:', error);
    }
  }

  private async loadDataCache(): Promise<void> {
    try {
      const cached = localStorage.getItem(`${CACHE_PREFIX}data`);
      if (cached) {
        this.dataCache = JSON.parse(cached);
        console.log('Loaded data cache:', this.dataCache?.transactions?.length, 'transactions');
      }
    } catch (error) {
      console.error('Failed to load data cache:', error);
      this.dataCache = null;
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
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

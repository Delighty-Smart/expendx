
import { supabase } from '@/integrations/supabase/client';
import { 
  initializeDB, 
  getAllTransactions, 
  addTransaction, 
  updateTransaction, 
  deleteTransaction,
  queueTransactionForSync,
  refreshLocalCache
} from './offlineStorage';

export interface SyncQueueItem {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  lastAttempt?: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  queueCount: number;
  lastSync?: Date;
  hasConflicts: boolean;
  errors: string[];
}

class SyncManager {
  private syncQueue: SyncQueueItem[] = [];
  private isCurrentlySyncing = false;
  private syncInterval?: number;
  private syncStatusCallbacks: ((status: SyncStatus) => void)[] = [];
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  constructor() {
    this.initializeSyncManager();
  }

  private async initializeSyncManager() {
    // Initialize offline database
    await initializeDB();
    
    // Load pending sync queue from storage
    await this.loadSyncQueue();
    
    // Set up online/offline listeners
    this.setupNetworkListeners();
    
    // Set up periodic sync
    this.setupPeriodicSync();
    
    // Try initial sync if online
    if (navigator.onLine) {
      this.performSync();
    }
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('Network: Online detected, starting sync');
      this.notifyStatusChange();
      this.performSync();
    });

    window.addEventListener('offline', () => {
      console.log('Network: Offline detected');
      this.notifyStatusChange();
    });
  }

  private setupPeriodicSync() {
    // Sync every 30 seconds when online
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine && this.syncQueue.length > 0) {
        this.performSync();
      }
    }, 30000);
  }

  private async loadSyncQueue() {
    try {
      const stored = localStorage.getItem('expendx_sync_queue');
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        console.log(`Loaded ${this.syncQueue.length} items from sync queue`);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  private async saveSyncQueue() {
    try {
      localStorage.setItem('expendx_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  public addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) {
    const queueItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0
    };

    this.syncQueue.push(queueItem);
    this.saveSyncQueue();
    this.notifyStatusChange();

    console.log(`Added item to sync queue: ${item.type} ${item.table}`, queueItem);

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.performSync();
    }
  }

  public async performSync(): Promise<void> {
    if (this.isCurrentlySyncing || !navigator.onLine || this.syncQueue.length === 0) {
      return;
    }

    this.isCurrentlySyncing = true;
    this.notifyStatusChange();

    console.log(`Starting sync of ${this.syncQueue.length} items`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log('No active session, skipping sync');
        return;
      }

      const userId = session.user.id;
      const itemsToSync = [...this.syncQueue];
      const syncErrors: string[] = [];

      for (const item of itemsToSync) {
        try {
          await this.syncItem(item, userId);
          // Remove successfully synced item
          this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          
          // Increment retry count
          const queueItem = this.syncQueue.find(q => q.id === item.id);
          if (queueItem) {
            queueItem.retryCount++;
            queueItem.lastAttempt = Date.now();
            
            // Remove item if max retries exceeded
            if (queueItem.retryCount >= this.maxRetries) {
              this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
              syncErrors.push(`Failed to sync ${item.type} ${item.table} after ${this.maxRetries} attempts`);
            }
          }
        }
      }

      // Save updated queue
      await this.saveSyncQueue();

      // Refresh local cache after successful sync
      if (syncErrors.length === 0) {
        await refreshLocalCache();
      }

      console.log(`Sync completed. ${itemsToSync.length - syncErrors.length} items synced, ${syncErrors.length} failed`);

    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isCurrentlySyncing = false;
      this.notifyStatusChange();
    }
  }

  private async syncItem(item: SyncQueueItem, userId: string): Promise<void> {
    const { type, table, data } = item;

    switch (table) {
      case 'transactions':
        await this.syncTransaction(type, data, userId);
        break;
      default:
        throw new Error(`Unsupported table: ${table}`);
    }
  }

  private async syncTransaction(type: string, data: any, userId: string): Promise<void> {
    const transactionData = {
      ...data,
      user_id: userId
    };

    switch (type) {
      case 'INSERT':
        const { error: insertError } = await supabase
          .from('transactions')
          .insert(transactionData);
        if (insertError) throw insertError;
        break;

      case 'UPDATE':
        const { error: updateError } = await supabase
          .from('transactions')
          .update(transactionData)
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

  public getSyncStatus(): SyncStatus {
    return {
      isOnline: navigator.onLine,
      isSyncing: this.isCurrentlySyncing,
      queueCount: this.syncQueue.length,
      lastSync: this.getLastSyncTime(),
      hasConflicts: false, // TODO: Implement conflict detection
      errors: []
    };
  }

  private getLastSyncTime(): Date | undefined {
    const lastSync = localStorage.getItem('expendx_last_sync');
    return lastSync ? new Date(lastSync) : undefined;
  }

  public onStatusChange(callback: (status: SyncStatus) => void) {
    this.syncStatusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.syncStatusCallbacks = this.syncStatusCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyStatusChange() {
    const status = this.getSyncStatus();
    this.syncStatusCallbacks.forEach(callback => callback(status));
  }

  public async forcSync(): Promise<void> {
    return this.performSync();
  }

  public clearSyncQueue(): void {
    this.syncQueue = [];
    this.saveSyncQueue();
    this.notifyStatusChange();
  }

  public destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.syncStatusCallbacks = [];
  }
}

// Export singleton instance
export const syncManager = new SyncManager();

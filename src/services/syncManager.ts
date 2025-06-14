
import { supabase } from '@/integrations/supabase/client';
import { 
  getAllTransactions, 
  batchUpdateTransactions, 
  addTransaction,
  updateTransaction,
  deleteTransaction 
} from './offlineStorage';

export interface SyncOperation {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface ConflictResolutionStrategy {
  strategy: 'client-wins' | 'server-wins' | 'timestamp-wins' | 'merge';
  customResolver?: (local: any, remote: any) => any;
}

class SyncManager {
  private syncQueue: SyncOperation[] = [];
  private isSyncing = false;
  private syncListeners: (() => void)[] = [];
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second

  constructor() {
    this.loadSyncQueue();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for network status changes
    window.addEventListener('online', () => {
      console.log('Network connection restored, starting sync...');
      this.syncAll();
    });

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_TRIGGERED') {
          this.syncAll();
        }
      });
    }
  }

  private async loadSyncQueue() {
    try {
      const stored = localStorage.getItem('syncQueue');
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.syncQueue = [];
    }
  }

  private saveSyncQueue() {
    try {
      localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  // Add operation to sync queue
  addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>) {
    const syncOp: SyncOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0
    };

    this.syncQueue.push(syncOp);
    this.saveSyncQueue();

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.syncAll();
    }
  }

  // Main sync function
  async syncAll(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) {
      return;
    }

    this.isSyncing = true;
    console.log(`Starting sync of ${this.syncQueue.length} operations`);

    try {
      // First, pull latest data from server
      await this.pullFromServer();
      
      // Then push local changes
      await this.pushToServer();
      
      this.notifySyncListeners();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async pullFromServer(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all transactions from server
      const { data: serverTransactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (serverTransactions && serverTransactions.length > 0) {
        // Get local transactions
        const localTransactions = await getAllTransactions();
        
        // Merge with conflict resolution
        const mergedTransactions = this.resolveConflicts(
          localTransactions,
          serverTransactions,
          { strategy: 'timestamp-wins' }
        );

        // Update local storage
        await batchUpdateTransactions(mergedTransactions);
        console.log(`Pulled ${serverTransactions.length} transactions from server`);
      }
    } catch (error) {
      console.error('Error pulling from server:', error);
    }
  }

  private async pushToServer(): Promise<void> {
    const failedOperations: SyncOperation[] = [];

    for (const operation of this.syncQueue) {
      try {
        await this.executeSyncOperation(operation);
        console.log(`Successfully synced operation ${operation.id}`);
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        
        operation.retryCount++;
        if (operation.retryCount < this.maxRetries) {
          failedOperations.push(operation);
        } else {
          console.error(`Max retries exceeded for operation ${operation.id}, removing from queue`);
        }
      }
    }

    // Update sync queue with failed operations
    this.syncQueue = failedOperations;
    this.saveSyncQueue();
  }

  private async executeSyncOperation(operation: SyncOperation): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    switch (operation.table) {
      case 'transactions':
        await this.syncTransaction(operation, user.id);
        break;
      default:
        throw new Error(`Unsupported table: ${operation.table}`);
    }
  }

  private async syncTransaction(operation: SyncOperation, userId: string): Promise<void> {
    const transactionData = { ...operation.data, user_id: userId };

    switch (operation.type) {
      case 'INSERT':
        const { error: insertError } = await supabase
          .from('transactions')
          .insert([transactionData]);
        if (insertError) throw insertError;
        break;

      case 'UPDATE':
        const { error: updateError } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', operation.data.id);
        if (updateError) throw updateError;
        break;

      case 'DELETE':
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', operation.data.id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  // Conflict resolution
  private resolveConflicts(
    localData: any[], 
    serverData: any[], 
    strategy: ConflictResolutionStrategy
  ): any[] {
    const localMap = new Map(localData.map(item => [item.id, item]));
    const serverMap = new Map(serverData.map(item => [item.id, item]));
    const result: any[] = [];

    // Handle server items
    for (const serverItem of serverData) {
      const localItem = localMap.get(serverItem.id);
      
      if (!localItem) {
        // Server item doesn't exist locally, add it
        result.push(serverItem);
      } else {
        // Conflict resolution
        const resolved = this.resolveConflict(localItem, serverItem, strategy);
        result.push(resolved);
        localMap.delete(serverItem.id);
      }
    }

    // Add remaining local items (not on server)
    for (const localItem of localMap.values()) {
      result.push(localItem);
    }

    return result;
  }

  private resolveConflict(
    local: any, 
    server: any, 
    strategy: ConflictResolutionStrategy
  ): any {
    switch (strategy.strategy) {
      case 'client-wins':
        return local;
      case 'server-wins':
        return server;
      case 'timestamp-wins':
        const localTime = new Date(local.updated_at || local.created_at).getTime();
        const serverTime = new Date(server.updated_at || server.created_at).getTime();
        return serverTime > localTime ? server : local;
      case 'merge':
        return strategy.customResolver ? strategy.customResolver(local, server) : server;
      default:
        return server;
    }
  }

  // Event system
  onSyncComplete(callback: () => void) {
    this.syncListeners.push(callback);
  }

  private notifySyncListeners() {
    this.syncListeners.forEach(callback => callback());
  }

  // Utility methods
  getSyncQueueLength(): number {
    return this.syncQueue.length;
  }

  isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  clearSyncQueue(): void {
    this.syncQueue = [];
    this.saveSyncQueue();
  }
}

export const syncManager = new SyncManager();

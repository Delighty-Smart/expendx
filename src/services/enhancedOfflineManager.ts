import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { Transaction, TransactionType } from '@/types/transactions';
import { getDocsWithIndexFallback, sortByDateDesc } from '@/lib/query-fallback';

// Enhanced offline storage with full data caching
const CACHE_VERSION = '1.0';
const CACHE_PREFIX = 'lucent_cache_';
const SYNC_QUEUE_KEY = 'lucent_sync_queue';
const LAST_SYNC_KEY = 'lucent_last_sync';

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
  // Owner the current in-memory cache belongs to. Guards against showing one
  // user's data to another when the auth session changes.
  private cacheOwnerId: string | null = null;

  constructor() {
    this.initializeManager();
    this.setupNetworkListeners();

    // Keep cached user id in sync with auth state
    onAuthStateChanged(auth, (fbUser) => {
      const previousUid = this.cachedUserId;
      this.cachedUserId = fbUser?.uid ?? null;

      try {
        if (this.cachedUserId) {
          localStorage.setItem('cached_user_id', this.cachedUserId);
        } else {
          localStorage.removeItem('cached_user_id');
        }
      } catch {
        // Storage can be unavailable in private mode
      }

      // A different user is now signed in — drop every cached byte so the
      // previous user's data can never be served to the new session.
      if (previousUid && this.cachedUserId && previousUid !== this.cachedUserId) {
        this.resetCachedData();
        if (this.isOnline) {
          void this.performFullDataSync();
        }
      } else if (!this.cachedUserId && previousUid) {
        this.resetCachedData();
      }
    });

    this.startPeriodicSync();
  }

  private resetCachedData() {
    this.dataCache = null;
    this.cacheOwnerId = null;
    try {
      localStorage.removeItem(`${CACHE_PREFIX}metadata`);
    } catch {
      // Ignore storage failures when clearing the cache
    }
    void this.clearIndexedDataCache();
  }

  private async clearIndexedDataCache(): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('transactions', 'readwrite');
        tx.objectStore('transactions').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.warn('Failed to clear cached transactions:', error);
    }
  }

  // The cache is only usable when it belongs to the signed-in user.
  private canUseCache(): boolean {
    if (!this.dataCache) return false;

    const currentUid = auth.currentUser?.uid ?? null;
    if (currentUid && this.cacheOwnerId && currentUid !== this.cacheOwnerId) return false;
    if (currentUid && this.cachedUserId && currentUid !== this.cachedUserId) return false;

    return true;
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
    // Firebase Auth is the source of truth — never trust a cached id over it.
    const fbUser = auth.currentUser;
    if (fbUser) {
      this.cachedUserId = fbUser.uid;
      try {
        localStorage.setItem('cached_user_id', fbUser.uid);
      } catch {
        // Ignore storage failures
      }
      return fbUser.uid;
    }

    // Fall back to the last known id only while auth is still restoring.
    try {
      const cached = localStorage.getItem('cached_user_id');
      if (cached) {
        this.cachedUserId = cached;
        return cached;
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
      const userId = await this.getCurrentUserId();
      console.log('Starting full data sync for user:', userId);

      // Fetch all user data in parallel
      const [transactions, budgets, savings, profile, settings] = await Promise.all([
        this.fetchTransactions(userId),
        this.fetchBudgets(userId),
        this.fetchSavings(userId),
        this.fetchProfile(userId),
        this.fetchSettings(userId)
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
      this.cacheOwnerId = userId;

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
    const snapshot = await getDocsWithIndexFallback(db, 'transactions', [
      where('user_id', '==', userId),
      where('archived', '==', false)
    ]);

    return sortByDateDesc(snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        type: data.type as TransactionType
      } as Transaction;
    }));
  }

  private async fetchBudgets(userId: string) {
    const q = query(
      collection(db, 'budget_categories'),
      where('user_id', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  }

  private async fetchSavings(userId: string) {
    const q = query(
      collection(db, 'savings_goals'),
      where('user_id', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  }

  private async fetchProfile(userId: string) {
    const docRef = doc(db, 'user_profiles', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }

  private async fetchSettings(userId: string) {
    const docRef = doc(db, 'user_settings', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }

  // Local data access methods with sync status
  getTransactions(filters?: any): Transaction[] {
    if (!this.canUseCache()) return [];

    let transactions = this.dataCache!.transactions;

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
    if (!this.canUseCache()) return { totalCredits: 0, totalDebits: 0, totalSavings: 0, balance: 0 };

    const transactions = this.dataCache!.transactions.filter(t => !t.archived);

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
    return this.canUseCache() ? this.dataCache!.budgets : [];
  }

  getSavings(): any[] {
    return this.canUseCache() ? this.dataCache!.savings : [];
  }

  getProfile(): any {
    return this.canUseCache() ? this.dataCache!.profile : null;
  }

  getSettings(): any {
    return this.canUseCache() ? this.dataCache!.settings : null;
  }

  // Enhanced offline operations - ONLY queue when offline
  async addTransactionOffline(transactionData: Omit<Transaction, 'id'>): Promise<string> {
    if (this.isOnline) {
      return await this.addTransactionOnline(transactionData);
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const transaction: Transaction = {
      ...transactionData,
      id: tempId
    };

    if (this.canUseCache() && this.dataCache) {
      this.dataCache.transactions.unshift(transaction);
      await this.saveDataCache();
    }

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

    const { is_locked, is_system_adjustment, unit_price, quantity, ...dbPayload } = transactionData as any;

    if (dbPayload.type === 'subscription') {
      dbPayload.type = 'debit';
    }

    const newDocRef = doc(collection(db, 'transactions'));
    const newTxData = {
      ...dbPayload,
      user_id: userId,
      id: newDocRef.id,
      archived: dbPayload.archived ?? false,
      created_at: new Date().toISOString()
    };

    await setDoc(newDocRef, newTxData);

    if (this.canUseCache() && this.dataCache) {
      this.dataCache.transactions.unshift(newTxData as Transaction);
      await this.saveDataCache();
    }

    console.log('Transaction saved online:', newDocRef.id);
    return newDocRef.id;
  }

  async updateTransactionOffline(id: string, updates: Partial<Transaction>): Promise<void> {
    if (this.isOnline) {
      return await this.updateTransactionOnline(id, updates);
    }

    if (this.canUseCache() && this.dataCache) {
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
    const { is_locked, is_system_adjustment, unit_price, quantity, ...cleanUpdates } = updates as any;

    if (cleanUpdates.type === 'subscription') {
      cleanUpdates.type = 'debit';
    }

    await updateDoc(doc(db, 'transactions', id), {
      ...cleanUpdates,
      updated_at: new Date().toISOString()
    });

    if (this.canUseCache() && this.dataCache) {
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
    if (this.isOnline) {
      return await this.deleteTransactionOnline(id);
    }

    if (this.canUseCache() && this.dataCache) {
      this.dataCache.transactions = this.dataCache.transactions.filter(t => t.id !== id);
      await this.saveDataCache();
    }

    if (!id.startsWith('temp_')) {
      await this.addToSyncQueue({
        type: 'DELETE',
        table: 'transactions',
        data: { id },
        status: 'pending'
      });
    } else {
      this.syncQueue = this.syncQueue.filter(item =>
        !(item.tempId === id || (item.data && item.data.id === id))
      );
      await this.saveSyncQueue();
    }
  }

  private async deleteTransactionOnline(id: string): Promise<void> {
    await deleteDoc(doc(db, 'transactions', id));

    if (this.canUseCache() && this.dataCache) {
      this.dataCache.transactions = this.dataCache.transactions.filter(t => t.id !== id);
      await this.saveDataCache();
    }

    console.log('Transaction deleted online:', id);
  }

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

    if (this.isOnline && !this.isSyncing) {
      setTimeout(() => this.processSyncQueue(), 1000);
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) return;

    this.isSyncing = true;
    this.notifyStatusChange();

    const pendingItems = this.syncQueue
      .filter(item => item.status === 'pending')
      .sort((a, b) => a.timestamp - b.timestamp);

    console.log(`Processing ${pendingItems.length} pending sync items`);

    for (const item of pendingItems) {
      try {
        item.status = 'syncing';
        await this.syncItem(item);

        item.status = 'synced';
        item.lastSyncedAt = Date.now();

        console.log(`Successfully synced ${item.type} ${item.table}`);

      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        item.status = 'failed';
        item.retryCount++;
      }
    }

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
        await this.syncGenericItem(type, table, data, item);
        break;
    }
  }

  private async syncGenericItem(type: string, table: string, data: any, item: SyncQueueItem): Promise<void> {
    switch (type) {
      case 'INSERT': {
        const insertData = { ...data };
        const docId = insertData.id || item.tempId || doc(collection(db, table)).id;
        insertData.id = docId;
        await setDoc(doc(db, table, docId), insertData);
        break;
      }
      case 'UPDATE': {
        if (!data.id) throw new Error(`Cannot update ${table}: missing id`);
        const { id, ...updateFields } = data;
        await updateDoc(doc(db, table, id), updateFields);
        break;
      }
      case 'DELETE': {
        if (!data.id) throw new Error(`Cannot delete from ${table}: missing id`);
        await deleteDoc(doc(db, table, data.id));
        break;
      }
      default:
        console.warn(`Unknown sync operation type: ${type} for table: ${table}`);
    }
  }

  private async syncTransaction(type: string, data: any, item: SyncQueueItem): Promise<void> {
    const userId = await this.getCurrentUserId();

    switch (type) {
      case 'INSERT': {
        const { is_locked, is_system_adjustment, unit_price, quantity, ...cleanData } = data || {};
        if (cleanData.type === 'subscription') cleanData.type = 'debit';
        
        const docRef = doc(collection(db, 'transactions'));
        const newTx = {
          ...cleanData,
          user_id: userId,
          id: docRef.id,
          created_at: new Date().toISOString()
        };
        await setDoc(docRef, newTx);

        if (this.canUseCache() && this.dataCache && item.tempId) {
          const tempIndex = this.dataCache.transactions.findIndex(t => t.id === item.tempId);
          if (tempIndex !== -1) {
            this.dataCache.transactions[tempIndex] = newTx as Transaction;
            await this.saveDataCache();
          }
        }
        break;
      }

      case 'UPDATE': {
        const { is_locked, is_system_adjustment, unit_price, quantity, id, ...cleanUpdateData } = data || {};
        if (cleanUpdateData.type === 'subscription') cleanUpdateData.type = 'debit';
        
        await updateDoc(doc(db, 'transactions', id), {
          ...cleanUpdateData,
          updated_at: new Date().toISOString()
        });
        break;
      }

      case 'DELETE':
        await deleteDoc(doc(db, 'transactions', data.id));
        break;

      default:
        throw new Error(`Unsupported sync type: ${type}`);
    }
  }

  private async getDB(): Promise<IDBDatabase> {
    const DB_NAME = 'expendx_offline';
    const DB_VERSION = 2;
    const TRANSACTIONS_STORE = 'transactions';
    const PENDING_CHANGES_STORE = 'pending_changes';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
          db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' });
        }

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

      const { transactions, ...metadata } = this.dataCache;
      localStorage.setItem(`${CACHE_PREFIX}metadata`, JSON.stringify({
        ...metadata,
        ownerId: this.cacheOwnerId,
      }));

      const db = await this.getDB();
      const tx = db.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');

      await new Promise<void>((resolve, reject) => {
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });

      for (const t of transactions) {
        store.put(t);
      }

      return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.error('Failed to save data cache to IndexedDB:', error);
    }
  }

  private async loadDataCache(): Promise<void> {
    try {
      const metaStr = localStorage.getItem(`${CACHE_PREFIX}metadata`);
      if (!metaStr) {
        this.dataCache = null;
        return;
      }

      const metadata = JSON.parse(metaStr);

      // Caches from older versions carry no owner id, and a cache written for a
      // different user must never be loaded. In both cases, drop it.
      const currentUid = auth.currentUser?.uid ?? null;
      if (!metadata.ownerId || (currentUid && metadata.ownerId !== currentUid)) {
        console.warn('Discarding offline cache that cannot be tied to the signed-in user');
        this.dataCache = null;
        this.cacheOwnerId = null;
        localStorage.removeItem(`${CACHE_PREFIX}metadata`);
        await this.clearIndexedDataCache();
        return;
      }

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
      this.cacheOwnerId = metadata.ownerId ?? null;

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
      if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn('LocalStorage quota exceeded. Clearing cache to save sync queue.');
        try {
          localStorage.removeItem(`${CACHE_PREFIX}data`);
          this.dataCache = null;
          localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
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

  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      queueCount: this.syncQueue.filter(item => item.status === 'pending').length,
      failedCount: this.syncQueue.filter(item => item.status === 'failed').length,
      lastSync: localStorage.getItem(LAST_SYNC_KEY) ? new Date(parseInt(localStorage.getItem(LAST_SYNC_KEY)!)) : null,
      hasData: this.canUseCache(),
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

  async forceSync(): Promise<void> {
    await this.performFullDataSync();
  }

  clearSyncQueue(): void {
    this.syncQueue = [];
    this.saveSyncQueue();
    this.notifyStatusChange();
  }

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

  getCacheAge(): number | null {
    if (!this.canUseCache() || !this.dataCache) return null;
    return Date.now() - this.dataCache.timestamp;
  }
}

export const enhancedOfflineManager = new EnhancedOfflineManager();


import { 
  initializeDB, 
  addTransaction, 
  updateTransaction, 
  deleteTransaction,
  getAllTransactions 
} from './offlineStorage';
import { syncManager } from './syncManager';

// Enhanced wrapper for offline operations with sync queue management
export class EnhancedOfflineStorage {
  
  // Transaction operations with automatic sync queuing
  static async addTransactionOffline(transactionData: any): Promise<string> {
    try {
      // Add to local storage
      const id = await addTransaction({
        ...transactionData,
        id: transactionData.id || crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Queue for sync
      syncManager.addToSyncQueue({
        type: 'INSERT',
        table: 'transactions',
        data: { ...transactionData, id }
      });

      return id;
    } catch (error) {
      console.error('Error adding transaction offline:', error);
      throw error;
    }
  }

  static async updateTransactionOffline(transactionData: any): Promise<void> {
    try {
      // Update local storage
      const updatedData = {
        ...transactionData,
        updated_at: new Date().toISOString()
      };
      
      await updateTransaction(updatedData);

      // Queue for sync
      syncManager.addToSyncQueue({
        type: 'UPDATE',
        table: 'transactions',
        data: updatedData
      });
    } catch (error) {
      console.error('Error updating transaction offline:', error);
      throw error;
    }
  }

  static async deleteTransactionOffline(id: string): Promise<void> {
    try {
      // Delete from local storage
      await deleteTransaction(id);

      // Queue for sync
      syncManager.addToSyncQueue({
        type: 'DELETE',
        table: 'transactions',
        data: { id }
      });
    } catch (error) {
      console.error('Error deleting transaction offline:', error);
      throw error;
    }
  }

  // Get all transactions with fallback
  static async getTransactions(): Promise<any[]> {
    try {
      return await getAllTransactions();
    } catch (error) {
      console.error('Error getting transactions from offline storage:', error);
      return [];
    }
  }

  // Initialize storage
  static async initialize(): Promise<void> {
    try {
      await initializeDB();
      console.log('Enhanced offline storage initialized');
    } catch (error) {
      console.error('Error initializing enhanced offline storage:', error);
      throw error;
    }
  }
}

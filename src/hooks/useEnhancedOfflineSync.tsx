
import { useState, useEffect } from 'react';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';
import { SyncStatus } from '@/components/PendingSyncIndicator';

export function useEnhancedOfflineSync() {
  const [syncStatus, setSyncStatus] = useState(enhancedOfflineManager.getSyncStatus());

  useEffect(() => {
    const unsubscribe = enhancedOfflineManager.onStatusChange(setSyncStatus);
    setSyncStatus(enhancedOfflineManager.getSyncStatus());
    return unsubscribe;
  }, []);

  const forceSync = async () => {
    try {
      await enhancedOfflineManager.forceSync();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  const getTransactionSyncStatus = (transactionId: string): SyncStatus => {
    if (!navigator.onLine && transactionId.startsWith('temp_')) {
      return 'offline';
    }
    
    if (enhancedOfflineManager.isTransactionSyncing(transactionId)) {
      return 'syncing';
    }
    
    if (enhancedOfflineManager.isTransactionFailed(transactionId)) {
      return 'failed';
    }
    
    if (enhancedOfflineManager.isTransactionPending(transactionId)) {
      return 'pending';
    }
    
    return 'synced';
  };

  const getCacheAge = () => {
    return enhancedOfflineManager.getCacheAge();
  };

  return {
    syncStatus,
    forceSync,
    getTransactionSyncStatus,
    getCacheAge
  };
}

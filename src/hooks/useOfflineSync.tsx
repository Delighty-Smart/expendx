
import { useState, useEffect } from 'react';
import { syncManager, SyncStatus } from '@/services/syncManager';

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getSyncStatus());

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncManager.onStatusChange(setSyncStatus);

    // Get initial status
    setSyncStatus(syncManager.getSyncStatus());

    return unsubscribe;
  }, []);

  const forceSync = async () => {
    try {
      await syncManager.forcSync();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  const clearQueue = () => {
    syncManager.clearSyncQueue();
  };

  return {
    syncStatus,
    forceSync,
    clearQueue
  };
}

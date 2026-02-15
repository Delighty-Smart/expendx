import { useState, useEffect } from 'react';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState(enhancedOfflineManager.getSyncStatus());

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = enhancedOfflineManager.onStatusChange(setSyncStatus);

    // Get initial status
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

  const clearQueue = () => {
    enhancedOfflineManager.clearSyncQueue();
  };

  return {
    syncStatus,
    forceSync,
    clearQueue
  };
}

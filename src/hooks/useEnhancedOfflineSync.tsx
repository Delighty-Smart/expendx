
import { useState, useEffect } from 'react';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';

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

  const isTransactionPending = (transactionId: string) => {
    return enhancedOfflineManager.isTransactionPending(transactionId);
  };

  const getCacheAge = () => {
    return enhancedOfflineManager.getCacheAge();
  };

  return {
    syncStatus,
    forceSync,
    isTransactionPending,
    getCacheAge
  };
}

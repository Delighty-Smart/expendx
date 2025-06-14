
import { useState, useEffect } from 'react';
import { syncManager } from '@/services/syncManager';
import { useToast } from '@/hooks/use-toast';

export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncQueueLength, setSyncQueueLength] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  useEffect(() => {
    // Network status listeners
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Syncing your data with the cloud...",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're Offline",
        description: "Don't worry, your data is saved locally and will sync when you're back online.",
        variant: "destructive"
      });
    };

    // Sync status listeners
    const handleSyncStart = () => {
      setIsSyncing(true);
    };

    const handleSyncComplete = () => {
      setIsSyncing(false);
      setSyncQueueLength(syncManager.getSyncQueueLength());
      
      if (isOnline) {
        toast({
          title: "Sync Complete",
          description: "Your data has been synchronized with the cloud.",
        });
      }
    };

    // Update sync queue length periodically
    const updateSyncQueue = () => {
      setSyncQueueLength(syncManager.getSyncQueueLength());
      setIsSyncing(syncManager.isCurrentlySyncing());
    };

    // Set up listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    syncManager.onSyncComplete(handleSyncComplete);

    // Update initial state
    updateSyncQueue();

    // Poll for sync status updates
    const interval = setInterval(updateSyncQueue, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [toast, isOnline]);

  const forcSync = async () => {
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Cannot sync while offline.",
        variant: "destructive"
      });
      return;
    }

    try {
      await syncManager.syncAll();
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "There was an error syncing your data. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    isSyncing,
    syncQueueLength,
    isOnline,
    forceSync: forcSync
  };
}

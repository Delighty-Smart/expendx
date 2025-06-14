
import { useState, useEffect, useCallback } from 'react';
import { offlineDataManager } from '@/services/offlineDataManager';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface OfflineDataStatus {
  isInitialized: boolean;
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  lastSync?: number;
  hasUnsynced: boolean;
  isLoading: boolean;
}

export function useOfflineData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<OfflineDataStatus>({
    isInitialized: false,
    isOnline: navigator.onLine,
    pendingCount: 0,
    failedCount: 0,
    hasUnsynced: false,
    isLoading: true
  });

  // Initialize offline data manager when user is available
  useEffect(() => {
    const initializeOfflineData = async () => {
      if (!user?.id) return;

      try {
        setStatus(prev => ({ ...prev, isLoading: true }));
        
        await offlineDataManager.initialize(user.id);
        
        // Start progressive backup
        offlineDataManager.startProgressiveBackup();
        
        setStatus(prev => ({ 
          ...prev, 
          isInitialized: true,
          isLoading: false 
        }));

        console.log('Offline data manager initialized for user:', user.id);
      } catch (error) {
        console.error('Failed to initialize offline data manager:', error);
        setStatus(prev => ({ ...prev, isLoading: false }));
        
        toast({
          title: "Offline Setup Error",
          description: "Failed to initialize offline storage. Some features may not work offline.",
          variant: "destructive"
        });
      }
    };

    initializeOfflineData();
  }, [user?.id, toast]);

  // Listen for online/offline status changes
  useEffect(() => {
    const handleOnline = async () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      
      // Process sync queue when coming online
      if (status.isInitialized) {
        try {
          await offlineDataManager.processSyncQueue();
          toast({
            title: "Back Online",
            description: "Syncing your offline changes...",
          });
        } catch (error) {
          console.error('Failed to process sync queue:', error);
        }
      }
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
      toast({
        title: "You're Offline",
        description: "Your changes will be saved and synced when you're back online.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status.isInitialized, toast]);

  // Listen for sync status changes
  useEffect(() => {
    if (!status.isInitialized) return;

    const updateSyncStatus = async () => {
      try {
        const syncStatus = await offlineDataManager.getSyncStatus();
        setStatus(prev => ({
          ...prev,
          ...syncStatus
        }));
      } catch (error) {
        console.error('Failed to get sync status:', error);
      }
    };

    // Update status immediately and then periodically
    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 5000);

    // Listen for sync events
    const unsubscribe = offlineDataManager.onStatusChange((event) => {
      console.log('Sync event:', event);
      
      switch (event.type) {
        case 'FULL_SYNC_COMPLETE':
          toast({
            title: "Data Synced",
            description: "All your data has been synced successfully.",
          });
          break;
        case 'ITEM_SYNCED':
          // Don't show toast for individual items to avoid spam
          break;
        case 'SYNC_ERROR':
          toast({
            title: "Sync Error",
            description: event.error || "Failed to sync some changes.",
            variant: "destructive"
          });
          break;
      }
      
      updateSyncStatus();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [status.isInitialized, toast]);

  // Data operations with offline support
  const addData = useCallback(async (tableName: string, data: any) => {
    if (!status.isInitialized) {
      throw new Error('Offline storage not initialized');
    }

    try {
      const id = await offlineDataManager.addDataOffline(tableName, data);
      
      // Show pending indicator if offline
      if (!navigator.onLine) {
        toast({
          title: "Saved Offline",
          description: "Your data will sync when you're back online.",
        });
      }
      
      return id;
    } catch (error) {
      console.error('Failed to add data offline:', error);
      throw error;
    }
  }, [status.isInitialized, toast]);

  const updateData = useCallback(async (tableName: string, id: string, updates: any) => {
    if (!status.isInitialized) {
      throw new Error('Offline storage not initialized');
    }

    try {
      await offlineDataManager.updateDataOffline(tableName, id, updates);
      
      if (!navigator.onLine) {
        toast({
          title: "Updated Offline",
          description: "Changes will sync when you're back online.",
        });
      }
    } catch (error) {
      console.error('Failed to update data offline:', error);
      throw error;
    }
  }, [status.isInitialized, toast]);

  const getData = useCallback(async (tableName: string, filters?: any) => {
    if (!status.isInitialized) {
      return [];
    }

    try {
      return await offlineDataManager.getData(tableName, filters);
    } catch (error) {
      console.error('Failed to get data:', error);
      return [];
    }
  }, [status.isInitialized]);

  const forceSync = useCallback(async () => {
    if (!status.isInitialized || !navigator.onLine) {
      return;
    }

    try {
      await offlineDataManager.performFullDataSync();
      await offlineDataManager.processSyncQueue();
      
      toast({
        title: "Sync Complete",
        description: "All data has been synced with the cloud.",
      });
    } catch (error) {
      console.error('Force sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync data. Please try again later.",
        variant: "destructive"
      });
    }
  }, [status.isInitialized, toast]);

  return {
    status,
    addData,
    updateData,
    getData,
    forceSync
  };
}

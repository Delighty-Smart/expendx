
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * Hook to manage Supabase Realtime subscriptions
 * @param tableName The table to subscribe to
 * @param event The event type ('INSERT', 'UPDATE', 'DELETE', '*')
 * @param callback The callback to execute when an event occurs
 */
export const useRealtimeSubscription = (
  tableName: string,
  event: RealtimeEvent,
  callback: (payload: any) => void
) => {
  // Create a stable callback reference
  const stableCallback = useCallback((payload: any) => {
    callback(payload);
  }, [callback]);

  useEffect(() => {
    // Generate a unique channel ID
    const channelId = `${tableName}_${event}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`Setting up subscription to ${tableName} table for ${event} events`);
    
    const channel = supabase.channel(channelId)
      .on(
        'postgres_changes',
        {
          event: event === '*' ? undefined : event,
          schema: 'public',
          table: tableName
        },
        (payload) => {
          console.log(`${tableName} change detected:`, payload);
          stableCallback(payload);
        }
      )
      .subscribe((status) => {
        console.log(`Subscription to ${tableName} status:`, status);
      });

    // Cleanup function
    return () => {
      console.log(`Cleaning up subscription to ${tableName}`);
      supabase.removeChannel(channel);
    };
  }, [tableName, event, stableCallback]);
};

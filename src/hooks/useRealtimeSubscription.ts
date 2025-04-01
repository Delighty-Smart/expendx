
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to safely manage Supabase Realtime subscriptions
 * @param tableName The table to subscribe to
 * @param event The event type ('INSERT', 'UPDATE', 'DELETE', '*')
 * @param callback The callback to execute when an event occurs
 */
export const useRealtimeSubscription = (
  tableName: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  callback: (payload: any) => void
) => {
  // Create a stable callback reference that doesn't cause rerenders
  const stableCallback = useCallback((payload: any) => {
    callback(payload);
  }, [callback]);

  useEffect(() => {
    const channelId = `${tableName}-${event}-${Math.random().toString(36).substring(2, 11)}`;
    
    console.log(`Setting up subscription to ${tableName} table for ${event} events`);
    
    // Create the channel
    const channel = supabase.channel(channelId);
    
    // Configure the channel with postgres changes using the correct API structure
    channel
      .on(
        'postgres_changes', 
        { 
          event: event,
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

    return () => {
      console.log(`Cleaning up subscription to ${tableName}`);
      supabase.removeChannel(channel);
    };
  }, [tableName, event, stableCallback]); // Only depend on the stable callback
};


import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * Hook to safely manage Supabase Realtime subscriptions
 * @param tableName The table to subscribe to
 * @param event The event type ('INSERT', 'UPDATE', 'DELETE', '*')
 * @param callback The callback to execute when an event occurs
 */
export const useRealtimeSubscription = (
  tableName: string,
  event: RealtimeEvent,
  callback: (payload: any) => void
) => {
  // Create a stable callback reference that doesn't cause rerenders
  const stableCallback = useCallback((payload: any) => {
    callback(payload);
  }, [callback]);

  useEffect(() => {
    const channelId = `${tableName}-${event}-${Math.random().toString(36).substring(2, 11)}`;
    
    console.log(`Setting up subscription to ${tableName} table for ${event} events`);
    
    // Create the channel with a unique ID
    const channel = supabase.channel(channelId);
    
    // Convert the event type to match what Supabase expects
    const eventType = event === '*' ? '*' : event;
    
    // Set up realtime subscription with proper types
    channel
      .on(
        'postgres_changes', 
        { 
          event: eventType,
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
  }, [tableName, event, stableCallback]);
};

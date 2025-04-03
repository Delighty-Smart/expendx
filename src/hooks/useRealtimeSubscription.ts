
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimeSubscriptionOptions {
  onError?: (error: any) => void;
  eventsPerSecond?: number;
}

/**
 * Hook to safely manage Supabase Realtime subscriptions
 * @param tableName The table to subscribe to
 * @param event The event type ('INSERT', 'UPDATE', 'DELETE', '*')
 * @param callback The callback to execute when an event occurs
 * @param options Additional configuration options
 */
export const useRealtimeSubscription = (
  tableName: string,
  event: RealtimeEvent,
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
  options: RealtimeSubscriptionOptions = {}
) => {
  // Create a stable callback reference that doesn't cause rerenders
  const stableCallback = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    callback(payload);
  }, [callback]);

  useEffect(() => {
    // Generate a unique channel ID to avoid conflicts
    const channelId = `${tableName}-${event}-${Math.random().toString(36).substring(2, 11)}`;
    
    console.log(`Setting up subscription to ${tableName} table for ${event} events`);
    
    // Create the channel with a unique ID
    const channel = supabase.channel(channelId);
    
    // Convert the event type to match what Supabase expects
    const eventType = event === '*' ? '*' : event;
    
    try {
      // Set up realtime subscription with proper configuration
      const subscription = channel
        .on(
          'postgres_changes', 
          { 
            event: eventType,
            schema: 'public',
            table: tableName
          } as any,  // Type assertion needed due to Supabase typing limitations
          (payload) => {
            console.log(`${tableName} change detected:`, payload);
            stableCallback(payload);
          }
        )
        .subscribe((status) => {
          console.log(`Subscription to ${tableName} status:`, status);
          
          if (status === 'SUBSCRIPTION_ERROR' && options.onError) {
            options.onError(`Error subscribing to ${tableName}`);
          }
        });
    } catch (error) {
      console.error(`Error setting up subscription to ${tableName}:`, error);
      if (options.onError) {
        options.onError(error);
      }
    }

    // Cleanup function to remove the channel when component unmounts
    return () => {
      console.log(`Cleaning up subscription to ${tableName}`);
      supabase.removeChannel(channel);
    };
  }, [tableName, event, stableCallback, options]);
};

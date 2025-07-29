
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * A hook to subscribe to real-time changes on a Supabase table
 * 
 * @param table The table name to subscribe to
 * @param event The event to listen for (INSERT, UPDATE, DELETE, or * for all)
 * @param callback The function to call when an event occurs
 * @param filter Optional filter configuration
 */
export function useRealtimeSubscription(
  table: string,
  event: RealtimeEvent,
  callback: (payload: any) => void,
  filter?: { column?: string; value?: string }
) {
  // Use refs to store stable references and prevent unnecessary re-subscriptions
  const callbackRef = useRef(callback);
  const filterRef = useRef(filter);
  
  // Update refs when values change
  callbackRef.current = callback;
  filterRef.current = filter;

  // Memoize the stable callback to prevent re-subscriptions
  const stableCallback = useCallback((payload: any) => {
    callbackRef.current(payload);
  }, []);

  useEffect(() => {
    // Create a unique channel identifier
    const channelId = `${table}-${event}-${filterRef.current?.column || 'all'}-${filterRef.current?.value || 'all'}`;
    
    console.log(`Setting up realtime subscription for ${table} table with event ${event}`);
    
    try {
      // Set up filter configuration if provided
      let filterConfig = {};
      if (filterRef.current?.column && filterRef.current?.value) {
        filterConfig = { [filterRef.current.column]: filterRef.current.value };
      }

      // Set up the subscription with the correct type casting
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes' as any, // Use type assertion to avoid the typescript error
          {
            event: event === '*' ? undefined : event,
            schema: 'public',
            table: table,
            ...(Object.keys(filterConfig).length > 0 ? { filter: filterConfig } : {})
          },
          (payload) => {
            console.log(`Realtime event received for ${table}:`, payload);
            stableCallback(payload);
          }
        )
        .subscribe((status) => {
          console.log(`Subscription status for ${table}:`, status);
        });
      
      // Cleanup function to remove the subscription when component unmounts
      return () => {
        console.log(`Cleaning up realtime subscription for ${table}`);
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error(`Error setting up realtime subscription for ${table}:`, error);
    }
  }, [table, event, stableCallback]); // Removed callback and filter from dependencies
}

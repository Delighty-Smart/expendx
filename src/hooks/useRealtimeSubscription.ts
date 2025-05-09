
import { useEffect } from 'react';
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
  useEffect(() => {
    // Create a unique channel identifier
    const channelId = `${table}-${event}-${filter?.column || 'all'}-${filter?.value || 'all'}`;
    
    console.log(`Setting up realtime subscription for ${table} table with event ${event}`);
    
    try {
      // Set up filter configuration if provided
      let filterConfig = {};
      if (filter?.column && filter?.value) {
        filterConfig = { [filter.column]: filter.value };
      }

      // Set up the subscription
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: event,
            schema: 'public',
            table: table,
            ...(Object.keys(filterConfig).length > 0 ? { filter: filterConfig } : {})
          },
          (payload) => {
            console.log(`Realtime event received for ${table}:`, payload);
            callback(payload);
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
  }, [table, event, callback, filter]);
}

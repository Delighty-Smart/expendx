
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
  callback: () => void,
  filter?: { column?: string; value?: string }
) {
  useEffect(() => {
    // Create a unique channel identifier
    const channelId = `${table}-${event}-${filter?.column || 'all'}-${filter?.value || 'all'}`;
    
    // Set up filter configuration if provided
    const filterConfig = filter?.column && filter?.value
      ? { [filter.column]: filter.value }
      : {};

    // Set up the subscription - Using correct typing
    const subscription = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: event,
          schema: 'public',
          table: table,
          ...filterConfig
        },
        () => callback()
      )
      .subscribe();
    
    // Cleanup function to remove the subscription when component unmounts
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [table, event, callback, filter]);
}

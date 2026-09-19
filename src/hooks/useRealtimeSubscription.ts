import { useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

/**
 * A hook to subscribe to real-time changes on a Firestore collection
 */
export function useRealtimeSubscription(
  table: string,
  event: RealtimeEvent,
  callback: (payload: any) => void,
  filter?: { column?: string; value?: string }
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const stableCallback = useCallback((payload: any) => {
    callbackRef.current(payload);
  }, []);

  useEffect(() => {
    console.log(`Setting up Firestore realtime subscription for ${table}`);

    try {
      let q = query(collection(db, table));
      if (filter?.column && filter?.value) {
        q = query(collection(db, table), where(filter.column, '==', filter.value));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          stableCallback({
            docs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          });
        },
        (error) => {
          console.error(`Error in Firestore realtime subscription for ${table}:`, error);
        }
      );

      return () => {
        console.log(`Cleaning up Firestore subscription for ${table}`);
        unsubscribe();
      };
    } catch (error) {
      console.error(`Error setting up realtime subscription for ${table}:`, error);
    }
  }, [table, event, filter?.column, filter?.value, stableCallback]);
}

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, doc, query, where, orderBy, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Subscription } from '@/types/subscriptions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'subscriptions'),
      where('user_id', '==', user.id),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => {
          const item = d.data();
          return {
            id: d.id,
            ...item,
            subscription_type: item.subscription_type as 'monthly' | 'annual',
            status: item.status as 'inactive' | 'active' | 'canceled' | 'expired'
          } as Subscription;
        });
        setSubscriptions(items);
        setLoading(false);
      },
      (error) => {
        console.warn('Subscription listener error:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  const fetchSubscriptions = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, 'subscriptions'),
        where('user_id', '==', currentUser.uid),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);

      setSubscriptions(
        snapshot.docs.map((d) => {
          const item = d.data();
          return {
            id: d.id,
            ...item,
            subscription_type: item.subscription_type as 'monthly' | 'annual',
            status: item.status as 'inactive' | 'active' | 'canceled' | 'expired'
          } as Subscription;
        })
      );
    } catch (error) {
      console.warn('Could not fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSubscription = async (subscriptionData: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const docRef = doc(collection(db, 'subscriptions'));
      await setDoc(docRef, {
        ...subscriptionData,
        id: docRef.id,
        user_id: currentUser.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      toast({
        title: "Success",
        description: "Subscription added successfully"
      });
    } catch (error: any) {
      console.error('Error adding subscription:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to add subscription",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    try {
      await updateDoc(doc(db, 'subscriptions', id), {
        ...updates,
        updated_at: new Date().toISOString()
      });

      toast({
        title: "Success",
        description: "Subscription updated successfully"
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteSubscription = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'subscriptions', id));

      toast({
        title: "Success",
        description: "Subscription deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast({
        title: "Error",
        description: "Failed to delete subscription",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    subscriptions,
    loading,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    refetch: fetchSubscriptions
  };
}
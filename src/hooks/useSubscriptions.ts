import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

    fetchSubscriptions();

    // Set up real-time subscription scoped to current user
    const channel = supabase
      .channel(`subscriptions-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Subscription change detected:', payload);
          fetchSubscriptions();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status for subscriptions:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to subscription changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to subscription changes');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const fetchSubscriptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions((data || []).map(item => ({
        ...item,
        subscription_type: item.subscription_type as 'monthly' | 'annual',
        status: item.status as 'inactive' | 'active' | 'canceled' | 'expired'
      })));
    } catch (error) {
      console.warn('Silent failure: Could not load subscriptions for integration:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSubscription = async (subscriptionData: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          ...subscriptionData,
          user_id: user.id,
        });

      if (error) throw error;

      await fetchSubscriptions();

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
      const { error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchSubscriptions();

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
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchSubscriptions();

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
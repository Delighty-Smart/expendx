import { useState, useEffect } from 'react';
import { useSubscriptions } from './useSubscriptions';
import { Subscription } from '@/types/subscriptions';
import { supabase } from '@/integrations/supabase/client';
import { addDays, addYears } from 'date-fns';

export interface SubscriptionOption {
  id: string;
  label: string;
  subscription: Subscription;
}

export function useSubscriptionIntegration() {
  const { subscriptions } = useSubscriptions();
  const [subscriptionOptions, setSubscriptionOptions] = useState<SubscriptionOption[]>([]);

  useEffect(() => {
    const options: SubscriptionOption[] = subscriptions.map(sub => ({
      id: sub.id,
      label: `${sub.service_provider} - ${sub.card_type} | ${sub.subscription_type} | ${sub.amount}`,
      subscription: sub
    }));
    setSubscriptionOptions(options);
  }, [subscriptions]);

  const updateSubscriptionStatus = async (subscriptionId: string, amount: number) => {
    try {
      const subscription = subscriptions.find(sub => sub.id === subscriptionId);
      if (!subscription) return;

      // Calculate next billing date
      const today = new Date();
      const nextBillingDate = subscription.subscription_type === 'monthly'
        ? addDays(today, 30)
        : addYears(today, 1);

      // Update subscription to active status
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          last_transaction_date: today.toISOString().split('T')[0],
          next_billing_date: nextBillingDate.toISOString().split('T')[0]
        })
        .eq('id', subscriptionId);

    } catch (error) {
      console.error('Error updating subscription status:', error);
    }
  };

  return {
    subscriptionOptions,
    updateSubscriptionStatus
  };
}
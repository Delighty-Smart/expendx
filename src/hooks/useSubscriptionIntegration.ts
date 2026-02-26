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

  const upsertSubscriptionFromTransaction = async (data: {
    subscriptionId?: string;
    amount: number;
    service_provider: string;
    card_type: string;
    last_four_digits: string;
    subscription_type: 'monthly' | 'annual';
  }) => {
    try {
      const today = new Date();
      const nextBillingDate = data.subscription_type === 'monthly'
        ? addDays(today, 30)
        : addYears(today, 1);

      const payload = {
        service_provider: data.service_provider,
        card_type: data.card_type,
        last_four_digits: data.last_four_digits,
        subscription_type: data.subscription_type,
        amount: data.amount,
        status: 'active' as const,
        last_transaction_date: today.toISOString().split('T')[0],
        next_billing_date: nextBillingDate.toISOString().split('T')[0]
      };

      if (data.subscriptionId) {
        // Update existing subscription
        const { error } = await supabase
          .from('subscriptions')
          .update(payload)
          .eq('id', data.subscriptionId);

        if (error) throw error;
      } else {
        // Need user_id for insert
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
          .from('subscriptions')
          .insert({
            ...payload,
            user_id: user.id
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error upserting subscription from transaction:', error);
      throw error;
    }
  };

  const updateSubscriptionStatus = async (subscriptionId: string, amount: number) => {
    try {
      const option = subscriptionOptions.find(opt => opt.id === subscriptionId);
      if (!option) return;

      const today = new Date();
      const nextBillingDate = option.subscription.subscription_type === 'monthly'
        ? addDays(today, 30)
        : addYears(today, 1);

      const { error } = await supabase
        .from('subscriptions')
        .update({
          last_transaction_date: today.toISOString().split('T')[0],
          next_billing_date: nextBillingDate.toISOString().split('T')[0]
        })
        .eq('id', subscriptionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating subscription status:', error);
      throw error;
    }
  };

  return {
    subscriptionOptions,
    upsertSubscriptionFromTransaction,
    updateSubscriptionStatus
  };
}
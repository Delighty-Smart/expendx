import { useState, useEffect } from 'react';
import { useSubscriptions } from './useSubscriptions';
import { Subscription } from '@/types/subscriptions';
import { auth, db } from '@/lib/firebase';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
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
        next_billing_date: nextBillingDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };

      if (data.subscriptionId) {
        // Update existing subscription
        await updateDoc(doc(db, 'subscriptions', data.subscriptionId), payload);
      } else {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        const docRef = doc(collection(db, 'subscriptions'));
        await setDoc(docRef, {
          ...payload,
          id: docRef.id,
          user_id: user.uid,
          created_at: new Date().toISOString()
        });
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

      await updateDoc(doc(db, 'subscriptions', subscriptionId), {
        last_transaction_date: today.toISOString().split('T')[0],
        next_billing_date: nextBillingDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      });
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
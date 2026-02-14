import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Subscription, SERVICE_PROVIDERS, CARD_TYPES, SUBSCRIPTION_TYPES, SUBSCRIPTION_STATUSES } from '@/types/subscriptions';
import { useToast } from '@/hooks/use-toast';
import { addDays, addYears } from 'date-fns';

interface SubscriptionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  subscription?: Subscription;
}

export function SubscriptionForm({ open, onOpenChange, onSubmit, subscription }: SubscriptionFormProps) {
  const [formData, setFormData] = useState({
    service_provider: '',
    card_type: '',
    last_four_digits: '',
    subscription_type: 'monthly' as 'monthly' | 'annual',
    amount: '',
    status: 'inactive' as 'inactive' | 'active' | 'canceled' | 'expired',
    next_billing_date: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (subscription) {
      setFormData({
        service_provider: subscription.service_provider,
        card_type: subscription.card_type,
        last_four_digits: subscription.last_four_digits,
        subscription_type: subscription.subscription_type,
        amount: subscription.amount.toString(),
        status: subscription.status,
        next_billing_date: subscription.next_billing_date || ''
      });
    } else {
      setFormData({
        service_provider: '',
        card_type: '',
        last_four_digits: '',
        subscription_type: 'monthly',
        amount: '',
        status: 'inactive',
        next_billing_date: ''
      });
    }
  }, [subscription, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.service_provider || !formData.card_type || !formData.last_four_digits || !formData.amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (formData.last_four_digits.length !== 4 || !/^\d{4}$/.test(formData.last_four_digits)) {
      toast({
        title: "Error",
        description: "Last 4 digits must be exactly 4 numbers",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Calculate next billing date if not provided and status is active
      let nextBillingDate = formData.next_billing_date;
      if (formData.status === 'active' && !nextBillingDate) {
        const today = new Date();
        nextBillingDate = formData.subscription_type === 'monthly'
          ? addDays(today, 30).toISOString().split('T')[0]
          : addYears(today, 1).toISOString().split('T')[0];
      }

      await onSubmit({
        service_provider: formData.service_provider,
        card_type: formData.card_type,
        last_four_digits: formData.last_four_digits,
        subscription_type: formData.subscription_type,
        amount,
        status: formData.status,
        next_billing_date: nextBillingDate || undefined,
        last_transaction_date: formData.status === 'active' ? new Date().toISOString().split('T')[0] : undefined
      });

      onOpenChange(false);
    } catch (error) {
      // Error is handled in the parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-[425px] overflow-y-auto max-h-[90vh] p-4 sm:p-6">

        <DialogHeader>
          <DialogTitle>
            {subscription ? 'Edit Subscription' : 'Add New Subscription'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service_provider">Service Provider</Label>
            <Select
              value={formData.service_provider}
              onValueChange={(value) => setFormData(prev => ({ ...prev, service_provider: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service provider" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_PROVIDERS.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="card_type">Card Type</Label>
            <Select
              value={formData.card_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, card_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select card type" />
              </SelectTrigger>
              <SelectContent>
                {CARD_TYPES.map((cardType) => (
                  <SelectItem key={cardType} value={cardType}>
                    {cardType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_four_digits">Last 4 Digits of Card</Label>
            <Input
              id="last_four_digits"
              type="text"
              placeholder="1234"
              maxLength={4}
              value={formData.last_four_digits}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setFormData(prev => ({ ...prev, last_four_digits: value }));
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subscription_type">Subscription Type</Label>
            <Select
              value={formData.subscription_type}
              onValueChange={(value: 'monthly' | 'annual') =>
                setFormData(prev => ({ ...prev, subscription_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'inactive' | 'active' | 'canceled' | 'expired') =>
                setFormData(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.status === 'active' && (
            <div className="space-y-2">
              <Label htmlFor="next_billing_date">Next Billing Date</Label>
              <Input
                id="next_billing_date"
                type="date"
                value={formData.next_billing_date}
                onChange={(e) => setFormData(prev => ({ ...prev, next_billing_date: e.target.value }))}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (subscription ? 'Update' : 'Add')} Subscription
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
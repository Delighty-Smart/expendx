import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Subscription, SERVICE_PROVIDERS, CARD_TYPES, SUBSCRIPTION_TYPES, SUBSCRIPTION_STATUSES } from '@/types/subscriptions';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from '@/hooks/useCategories';
import { addDays, addYears } from 'date-fns';
import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';

interface SubscriptionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  subscription?: Subscription;
}

export function SubscriptionForm({ open, onOpenChange, onSubmit, subscription }: SubscriptionFormProps) {
  const { currency } = useSettings();
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

  const { categories: customProviders } = useCategories('subscription');

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
        status: 'active',
        next_billing_date: ''
      });
    }
  }, [subscription, open]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0 || isNaN(parseFloat(formData.amount))) {
      newErrors.amount = "Please enter a valid amount";
    }
    if (!formData.service_provider) {
      newErrors.service_provider = "Select a service provider";
    }
    if (!formData.card_type) {
      newErrors.card_type = "Select payment method";
    }
    if (!formData.last_four_digits || formData.last_four_digits.length !== 4 || !/^\d{4}$/.test(formData.last_four_digits)) {
      newErrors.last_four_digits = "Must be 4 digits";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        title: "Validation Error",
        description: "Please fill in all highlighted fields correctly",
        variant: "destructive"
      });
      return;
    }

    setErrors({});
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
        amount: parseFloat(formData.amount),
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
      <DialogContent className="sm:max-w-[480px]">

        <DialogHeader>
          <DialogTitle>
            {subscription ? 'Edit Subscription' : 'Add New Subscription'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Large Prominent centered Amount Input */}
          <div className="space-y-1 text-center py-2">
            <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Amount</Label>
            <div className="relative flex items-center justify-center">
              <span className="text-3xl font-extrabold text-muted-foreground/60 mr-1 select-none font-numeric">
                {currency?.symbol || "$"}
              </span>
              <input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className={cn(
                  "bg-transparent border-b-2 text-center text-4xl font-extrabold tracking-tight focus:outline-none w-48 text-foreground placeholder:text-muted-foreground/30 font-numeric transition-colors",
                  errors.amount ? "border-destructive bg-destructive/5 text-destructive" : "border-transparent focus:border-primary"
                )}
                value={formData.amount}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, amount: e.target.value }));
                  if (errors.amount) setErrors(prev => ({ ...prev, amount: "" }));
                }}
                disabled={loading}
              />
            </div>
            {errors.amount && <p className="text-[10px] text-destructive font-semibold mt-1">{errors.amount}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service_provider" className={cn("text-xs font-bold uppercase tracking-wider", errors.service_provider ? "text-destructive" : "text-muted-foreground/60")}>Service Provider</Label>
              <Select
                value={formData.service_provider}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, service_provider: value }));
                  if (errors.service_provider) setErrors(prev => ({ ...prev, service_provider: "" }));
                }}
                disabled={loading}
              >
                <SelectTrigger className={cn("h-11 bg-muted/30 border rounded-xl font-medium transition-colors", errors.service_provider ? "border-destructive bg-destructive/5 text-destructive" : "border-none")}>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set([...SERVICE_PROVIDERS, ...customProviders])).map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.service_provider && <p className="text-[10px] text-destructive font-semibold">{errors.service_provider}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscription_type" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">Billing Cycle</Label>
              <Select
                value={formData.subscription_type}
                onValueChange={(value: 'monthly' | 'annual') =>
                  setFormData(prev => ({ ...prev, subscription_type: value }))
                }
                disabled={loading}
              >
                <SelectTrigger className="h-11 bg-muted/30 border-none rounded-xl font-medium">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="card_type" className={cn("text-xs font-bold uppercase tracking-wider", errors.card_type ? "text-destructive" : "text-muted-foreground/60")}>Payment Method</Label>
              <Select
                value={formData.card_type}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, card_type: value }));
                  if (errors.card_type) setErrors(prev => ({ ...prev, card_type: "" }));
                }}
                disabled={loading}
              >
                <SelectTrigger className={cn("h-11 bg-muted/30 border rounded-xl font-medium transition-colors", errors.card_type ? "border-destructive bg-destructive/5 text-destructive" : "border-none")}>
                  <SelectValue placeholder="Card type" />
                </SelectTrigger>
                <SelectContent>
                  {CARD_TYPES.map((cardType) => (
                    <SelectItem key={cardType} value={cardType}>
                      {cardType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.card_type && <p className="text-[10px] text-destructive font-semibold">{errors.card_type}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_four_digits" className={cn("text-xs font-bold uppercase tracking-wider", errors.last_four_digits ? "text-destructive" : "text-muted-foreground/60")}>Last 4 Digits</Label>
              <Input
                id="last_four_digits"
                type="text"
                placeholder="1234"
                maxLength={4}
                className={cn("h-11 bg-muted/30 border rounded-xl font-medium transition-colors", errors.last_four_digits ? "border-destructive bg-destructive/5 text-destructive placeholder:text-destructive/50" : "border-none")}
                value={formData.last_four_digits}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData(prev => ({ ...prev, last_four_digits: value }));
                  if (errors.last_four_digits) setErrors(prev => ({ ...prev, last_four_digits: "" }));
                }}
                disabled={loading}
              />
              {errors.last_four_digits && <p className="text-[10px] text-destructive font-semibold">{errors.last_four_digits}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'inactive' | 'active' | 'canceled' | 'expired') =>
                setFormData(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger className="h-11 bg-muted/30 border-none rounded-xl font-medium">
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
                className="h-11 bg-muted/30 border-none rounded-xl font-medium"
                value={formData.next_billing_date}
                onChange={(e) => setFormData(prev => ({ ...prev, next_billing_date: e.target.value }))}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-border/10">
            <Button
              type="button"
              variant="ghost"
              className="h-12 rounded-xl px-6 font-bold text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-12 rounded-xl px-8 font-bold hover:scale-105 active:scale-95 transition-all"
              disabled={loading}
            >
              {loading ? 'Saving...' : (subscription ? 'Update' : 'Add')} Subscription
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SubscriptionForm;
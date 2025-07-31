import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SubscriptionForm } from '@/components/SubscriptionForm';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { Subscription, SUBSCRIPTION_STATUSES } from '@/types/subscriptions';
import { Plus, CreditCard, Calendar, DollarSign, Settings, Trash2 } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { getCurrencyByCode } from '@/lib/currencies';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function Subscriptions() {
  const [showForm, setShowForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | undefined>();
  const { subscriptions, loading, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const { currency } = useSettings();

  const handleAddSubscription = async (subscriptionData: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    await addSubscription(subscriptionData);
    setShowForm(false);
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setShowForm(true);
  };

  const handleUpdateSubscription = async (subscriptionData: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (editingSubscription) {
      await updateSubscription(editingSubscription.id, subscriptionData);
      setShowForm(false);
      setEditingSubscription(undefined);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    await deleteSubscription(id);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = SUBSCRIPTION_STATUSES.find(s => s.value === status);
    return (
      <Badge variant={status === 'active' ? 'default' : 'secondary'} className={statusConfig?.color}>
        {statusConfig?.label}
      </Badge>
    );
  };

  const getBillingProgress = (subscription: Subscription) => {
    if (!subscription.next_billing_date || subscription.status !== 'active') return 0;
    
    const now = new Date();
    const nextBilling = new Date(subscription.next_billing_date);
    const lastBilling = subscription.subscription_type === 'monthly' 
      ? addDays(nextBilling, -30)
      : addDays(nextBilling, -365);
    
    const totalDays = subscription.subscription_type === 'monthly' ? 30 : 365;
    const daysPassed = Math.floor((now.getTime() - lastBilling.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100);
  };

  const getDaysUntilRenewal = (subscription: Subscription) => {
    if (!subscription.next_billing_date || subscription.status !== 'active') return null;
    
    const now = new Date();
    const nextBilling = new Date(subscription.next_billing_date);
    const daysUntil = Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntil > 0 ? daysUntil : 0;
  };

  const totalMonthlySpend = subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((total, sub) => {
      const monthlyAmount = sub.subscription_type === 'annual' ? sub.amount / 12 : sub.amount;
      return total + monthlyAmount;
    }, 0);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Loading subscriptions...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Subscriptions</h1>
            <p className="text-muted-foreground">Manage your recurring subscriptions</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Subscription
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscriptions.filter(sub => sub.status === 'active').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currency.symbol}{totalMonthlySpend.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscriptions.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions List */}
        <div className="space-y-4">
          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No subscriptions yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start tracking your recurring subscriptions to better manage your expenses
                </p>
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Subscription
                </Button>
              </CardContent>
            </Card>
          ) : (
            subscriptions.map((subscription) => {
              const progress = getBillingProgress(subscription);
              const daysUntilRenewal = getDaysUntilRenewal(subscription);
              
              return (
                <Card key={subscription.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{subscription.service_provider}</h3>
                          {getStatusBadge(subscription.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Card:</span> {subscription.card_type} ****{subscription.last_four_digits}
                          </div>
                          <div>
                            <span className="font-medium">Type:</span> {subscription.subscription_type}
                          </div>
                          <div>
                            <span className="font-medium">Amount:</span> {currency.symbol}{subscription.amount.toFixed(2)}
                          </div>
                          {subscription.next_billing_date && (
                            <div>
                              <span className="font-medium">Next Billing:</span> {format(new Date(subscription.next_billing_date), 'MMM dd, yyyy')}
                            </div>
                          )}
                        </div>

                        {subscription.status === 'active' && daysUntilRenewal !== null && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">
                                Billing Cycle Progress
                              </span>
                              <span className="text-sm font-medium">
                                {daysUntilRenewal} days until renewal
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditSubscription(subscription)}>
                            Edit Subscription
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Subscription
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this subscription? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSubscription(subscription.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Subscription Form Modal */}
        <SubscriptionForm
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) {
              setEditingSubscription(undefined);
            }
          }}
          onSubmit={editingSubscription ? handleUpdateSubscription : handleAddSubscription}
          subscription={editingSubscription}
        />
      </div>
    </Layout>
  );
}
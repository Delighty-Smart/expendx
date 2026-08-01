/**
 * Subscription Service
 *
 * Wraps recurring bills and subscription operations as AI capabilities.
 * Data source: enhancedOfflineManager transactions filtered by type="subscription".
 */

import type { ToolResult, ExecutionContext } from '@/types/lucent-capability-types';
import { capabilityRegistry } from '@/services/ai/capability-registry';
import { lucentEventBus } from '@/services/ai/event-bus';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';

function getSubscriptions(
  _params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<Array<{ id: string; name: string; amount: number; frequency: string; category: string }>>> {
  const allTxns = enhancedOfflineManager.getTransactions();
  const subs = allTxns
    .filter(t => t.type === 'subscription')
    .map(t => ({
      id: t.id,
      name: t.description || t.category,
      amount: Number(t.amount),
      frequency: 'monthly',
      category: t.category,
    }));

  return Promise.resolve({
    success: true,
    data: subs,
    source: 'subscriptions',
    timestamp: Date.now(),
  });
}

function getSubscriptionCost(
  _params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ totalMonthlyCost: number; activeCount: number }>> {
  const allTxns = enhancedOfflineManager.getTransactions();
  const subs = allTxns.filter(t => t.type === 'subscription');
  const totalMonthlyCost = subs.reduce((sum, t) => sum + Number(t.amount), 0);

  return Promise.resolve({
    success: true,
    data: {
      totalMonthlyCost,
      activeCount: subs.length,
    },
    source: 'subscriptions',
    timestamp: Date.now(),
  });
}

async function addSubscription(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ subscriptionId: string }>> {
  const { name, amount, category } = params;

  const id = await enhancedOfflineManager.addTransactionOffline({
    user_id: ctx.userId,
    amount: Number(amount),
    type: 'subscription',
    category: category || 'Subscriptions',
    description: name || 'Recurring Subscription',
    date: new Date().toISOString().split('T')[0],
    archived: false,
  });

  ctx.invalidateQueries?.(['transactions', 'subscriptions']);
  lucentEventBus.emit('subscription:added', { id, name, amount: Number(amount) }, 'subscription-service');

  return {
    success: true,
    data: { subscriptionId: id },
    source: 'subscriptions',
    timestamp: Date.now(),
  };
}

async function deleteSubscription(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ deleted: boolean }>> {
  const { id } = params;

  await enhancedOfflineManager.deleteTransactionOffline(id);
  ctx.invalidateQueries?.(['transactions', 'subscriptions']);
  lucentEventBus.emit('subscription:deleted', { id }, 'subscription-service');

  return {
    success: true,
    data: { deleted: true },
    source: 'subscriptions',
    timestamp: Date.now(),
  };
}

export function registerSubscriptionService(): void {
  capabilityRegistry.registerModule({
    id: 'subscriptions',
    name: 'Subscription Service',
    description: 'Manages recurring monthly bills, subscriptions, and subscription cost tracking.',
    toolNames: ['getSubscriptions', 'getSubscriptionCost', 'addSubscription', 'deleteSubscription'],
    version: '1.0.0',
  });

  capabilityRegistry.registerTool({
    name: 'getSubscriptions',
    description: 'Get all active monthly subscriptions and recurring bills.',
    module: 'subscriptions',
    inputSchema: {},
    outputDescription: 'Array of { id, name, amount, frequency, category }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getSubscriptions);

  capabilityRegistry.registerTool({
    name: 'getSubscriptionCost',
    description: 'Calculate total monthly commitment for all active subscriptions.',
    module: 'subscriptions',
    inputSchema: {},
    outputDescription: '{ totalMonthlyCost, activeCount }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getSubscriptionCost);

  capabilityRegistry.registerTool({
    name: 'addSubscription',
    description: 'Add a new recurring monthly subscription (e.g., Netflix, Spotify, Internet).',
    module: 'subscriptions',
    inputSchema: {
      name: { type: 'string', description: 'Subscription name (e.g., "Netflix")', required: true },
      amount: { type: 'number', description: 'Monthly subscription cost', required: true },
      category: { type: 'string', description: 'Category (optional)', required: false },
    },
    outputDescription: '{ subscriptionId }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, addSubscription);

  capabilityRegistry.registerTool({
    name: 'deleteSubscription',
    description: 'Cancel or remove a recurring subscription.',
    module: 'subscriptions',
    inputSchema: {
      id: { type: 'string', description: 'Subscription ID to cancel', required: true },
    },
    outputDescription: '{ deleted: boolean }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, deleteSubscription);
}

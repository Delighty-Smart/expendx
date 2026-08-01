/**
 * Alert Service
 *
 * Manages financial budget alerts, threshold warnings, and streak notifications.
 * Data source: enhancedOfflineManager + local storage alert state.
 */

import type { ToolResult, ExecutionContext } from '@/types/lucent-capability-types';
import { capabilityRegistry } from '@/services/ai/capability-registry';
import { lucentEventBus } from '@/services/ai/event-bus';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';

function getAlerts(
  _params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<Array<{ id: string; type: string; title: string; message: string; isRead: boolean }>>> {
  const budgets = enhancedOfflineManager.getBudgets();
  const allTxns = enhancedOfflineManager.getTransactions();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthTxns = allTxns.filter(t => t.date?.startsWith(currentMonth));

  const alerts: Array<{ id: string; type: string; title: string; message: string; isRead: boolean }> = [];

  budgets.forEach((b: any, idx: number) => {
    const limit = Number(b.monthly_limit || 0);
    const spent = monthTxns
      .filter(t => t.type === 'debit' && t.category === b.category)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const pct = limit > 0 ? (spent / limit) * 100 : 0;

    if (pct > 100) {
      alerts.push({
        id: `alert-over-${idx}`,
        type: 'warning',
        title: `Over Budget: ${b.category}`,
        message: `You've spent ${spent.toLocaleString()} of your ${limit.toLocaleString()} limit (${Math.round(pct)}%).`,
        isRead: false,
      });
    } else if (pct >= 80) {
      alerts.push({
        id: `alert-near-${idx}`,
        type: 'info',
        title: `Nearing Limit: ${b.category}`,
        message: `You've used ${Math.round(pct)}% of your ${b.category} budget.`,
        isRead: false,
      });
    }
  });

  return Promise.resolve({
    success: true,
    data: alerts,
    source: 'alerts',
    timestamp: Date.now(),
  });
}

function markAlertAsRead(
  params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ success: boolean }>> {
  const { id } = params;
  lucentEventBus.emit('alert:read', { id }, 'alert-service');

  return Promise.resolve({
    success: true,
    data: { success: true },
    source: 'alerts',
    timestamp: Date.now(),
  });
}

export function registerAlertService(): void {
  capabilityRegistry.registerModule({
    id: 'alerts',
    name: 'Alert Service',
    description: 'Manages budget threshold warnings, overspend alerts, and notifications.',
    toolNames: ['getAlerts', 'markAlertAsRead'],
    version: '1.0.0',
  });

  capabilityRegistry.registerTool({
    name: 'getAlerts',
    description: 'Get active financial alerts, over-budget warnings, and notifications.',
    module: 'alerts',
    inputSchema: {},
    outputDescription: 'Array of { id, type, title, message, isRead }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getAlerts);

  capabilityRegistry.registerTool({
    name: 'markAlertAsRead',
    description: 'Mark a budget warning or alert as read.',
    module: 'alerts',
    inputSchema: {
      id: { type: 'string', description: 'Alert ID to mark as read', required: true },
    },
    outputDescription: '{ success: boolean }',
    accessLevel: 'write',
    requiresConfirmation: false,
    requiresAuth: true,
  }, markAlertAsRead);
}

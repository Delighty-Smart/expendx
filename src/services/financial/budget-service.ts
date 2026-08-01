/**
 * Budget Service
 *
 * Wraps all budget operations and registers them as tools.
 * Data source: enhancedOfflineManager + Supabase budget_categories table.
 */

import type {
  ToolResult,
  ExecutionContext,
  BudgetStatus,
} from '@/types/lucent-capability-types';
import { capabilityRegistry } from '@/services/ai/capability-registry';
import { lucentEventBus } from '@/services/ai/event-bus';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';
import { supabase } from '@/integrations/supabase/client';

// ─── Service Functions ───────────────────────────────────────────────────────

function getBudgets(
  _params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<BudgetStatus[]>> {
  const budgets = enhancedOfflineManager.getBudgets();
  const allTxns = enhancedOfflineManager.getTransactions();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthTxns = allTxns.filter(t => t.date?.startsWith(currentMonth));

  const statuses: BudgetStatus[] = budgets.map((b: any) => {
    const limit = Number(b.monthly_limit || 0);
    const spent = monthTxns
      .filter(t => t.type === 'debit' && t.category === b.category)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const percentUsed = limit > 0 ? Math.round((spent / limit) * 100) : 0;

    return {
      category: b.category,
      limit,
      spent,
      percentUsed,
      remaining: Math.max(0, limit - spent),
      status: percentUsed > 100 ? 'over' as const : percentUsed > 80 ? 'warning' as const : 'ok' as const,
    };
  });

  return Promise.resolve({
    success: true,
    data: statuses,
    source: 'budgets',
    timestamp: Date.now(),
  });
}

function getBudgetStatus(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<BudgetStatus | null>> {
  return getBudgets({}, ctx).then(result => {
    const match = result.data?.find(b => b.category.toLowerCase().includes((params.category || '').toLowerCase()));
    return {
      success: true,
      data: match || null,
      source: 'budgets',
      timestamp: Date.now(),
    };
  });
}

function getBudgetHealth(
  _params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ score: number; overBudgetCount: number; onTrackCount: number; totalBudgeted: number; totalSpent: number }>> {
  return getBudgets({}, ctx).then(result => {
    const budgets = result.data || [];
    const overCount = budgets.filter(b => b.status === 'over').length;
    const okCount = budgets.filter(b => b.status === 'ok').length;
    const totalBudgeted = budgets.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const score = budgets.length > 0
      ? Math.round(((budgets.length - overCount) / budgets.length) * 100)
      : 100;

    return {
      success: true,
      data: { score, overBudgetCount: overCount, onTrackCount: okCount, totalBudgeted, totalSpent },
      source: 'budgets',
      timestamp: Date.now(),
    };
  });
}

async function createBudget(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ created: boolean }>> {
  const { category, monthlyLimit } = params;

  const { error } = await supabase
    .from('budget_categories')
    .insert({ category, monthly_limit: Number(monthlyLimit), user_id: ctx.userId });

  if (error) {
    return { success: false, error: error.message, source: 'budgets', timestamp: Date.now() };
  }

  ctx.invalidateQueries?.(['enhanced_budgets', 'budgets']);
  lucentEventBus.emit('budget:created', { category, limit: Number(monthlyLimit) }, 'budget-service');

  return { success: true, data: { created: true }, source: 'budgets', timestamp: Date.now() };
}

async function updateBudget(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ updated: boolean }>> {
  const { id, monthlyLimit } = params;

  const { error } = await supabase
    .from('budget_categories')
    .update({ monthly_limit: Number(monthlyLimit) })
    .eq('id', id)
    .eq('user_id', ctx.userId);

  if (error) {
    return { success: false, error: error.message, source: 'budgets', timestamp: Date.now() };
  }

  ctx.invalidateQueries?.(['enhanced_budgets', 'budgets']);
  lucentEventBus.emit('budget:updated', { id, limit: Number(monthlyLimit) }, 'budget-service');

  return { success: true, data: { updated: true }, source: 'budgets', timestamp: Date.now() };
}

async function deleteBudget(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ deleted: boolean }>> {
  const { id } = params;

  const { error } = await supabase
    .from('budget_categories')
    .delete()
    .eq('id', id)
    .eq('user_id', ctx.userId);

  if (error) {
    return { success: false, error: error.message, source: 'budgets', timestamp: Date.now() };
  }

  ctx.invalidateQueries?.(['enhanced_budgets', 'budgets']);
  lucentEventBus.emit('budget:deleted', { id }, 'budget-service');

  return { success: true, data: { deleted: true }, source: 'budgets', timestamp: Date.now() };
}

function recommendBudget(
  _params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ recommendations: Array<{ category: string; suggestedLimit: number; reason: string }> }>> {
  const allTxns = enhancedOfflineManager.getTransactions();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthTxns = allTxns.filter(t => t.date?.startsWith(currentMonth) && t.type === 'debit');

  // Group by category and compute average + 10% buffer
  const categoryTotals: Record<string, number> = {};
  monthTxns.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
  });

  const recommendations = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, total]) => ({
      category,
      suggestedLimit: Math.ceil(total * 1.1 / 1000) * 1000, // Round up to nearest 1000
      reason: `Based on current spending of ${total.toLocaleString()} this month, plus a 10% buffer.`,
    }));

  return Promise.resolve({
    success: true,
    data: { recommendations },
    source: 'budgets',
    timestamp: Date.now(),
  });
}

// ─── Registration ────────────────────────────────────────────────────────────

export function registerBudgetService(): void {
  capabilityRegistry.registerModule({
    id: 'budgets',
    name: 'Budget Service',
    description: 'Manages budget categories, limits, status tracking, and budget health scoring.',
    toolNames: ['getBudgets', 'getBudgetStatus', 'getBudgetHealth', 'createBudget', 'updateBudget', 'deleteBudget', 'recommendBudget'],
    version: '1.0.0',
  });

  capabilityRegistry.registerTool({
    name: 'getBudgets',
    description: 'Get all budget categories with current spending vs. limits, percentage used, and status (ok/warning/over).',
    module: 'budgets',
    inputSchema: {},
    outputDescription: 'Array of { category, limit, spent, percentUsed, remaining, status }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getBudgets);

  capabilityRegistry.registerTool({
    name: 'getBudgetStatus',
    description: 'Get budget status for a specific category.',
    module: 'budgets',
    inputSchema: {
      category: { type: 'string', description: 'Category name to check', required: true },
    },
    outputDescription: '{ category, limit, spent, percentUsed, remaining, status } or null',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getBudgetStatus);

  capabilityRegistry.registerTool({
    name: 'getBudgetHealth',
    description: 'Get overall budget health: score (0-100), count of over-budget and on-track categories, and totals.',
    module: 'budgets',
    inputSchema: {},
    outputDescription: '{ score, overBudgetCount, onTrackCount, totalBudgeted, totalSpent }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getBudgetHealth);

  capabilityRegistry.registerTool({
    name: 'createBudget',
    description: 'Create a new budget category with a monthly spending limit.',
    module: 'budgets',
    inputSchema: {
      category: { type: 'string', description: 'Budget category name', required: true },
      monthlyLimit: { type: 'number', description: 'Monthly spending limit', required: true },
    },
    outputDescription: '{ created: boolean }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, createBudget);

  capabilityRegistry.registerTool({
    name: 'updateBudget',
    description: 'Update a budget category limit.',
    module: 'budgets',
    inputSchema: {
      id: { type: 'string', description: 'Budget ID', required: true },
      monthlyLimit: { type: 'number', description: 'New monthly limit', required: true },
    },
    outputDescription: '{ updated: boolean }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, updateBudget);

  capabilityRegistry.registerTool({
    name: 'deleteBudget',
    description: 'Delete a budget category.',
    module: 'budgets',
    inputSchema: {
      id: { type: 'string', description: 'Budget ID to delete', required: true },
    },
    outputDescription: '{ deleted: boolean }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, deleteBudget);

  capabilityRegistry.registerTool({
    name: 'recommendBudget',
    description: 'Get AI-powered budget recommendations based on current spending patterns. Suggests limits for top spending categories.',
    module: 'budgets',
    inputSchema: {},
    outputDescription: '{ recommendations: [{ category, suggestedLimit, reason }] }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, recommendBudget);
}

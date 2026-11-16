/**
 * Budget Service
 *
 * Wraps all budget operations and registers them as tools.
 * Data source: enhancedOfflineManager + Firestore budget_categories collection.
 */

import type {
  ToolResult,
  ExecutionContext,
  BudgetStatus,
} from '@/types/lucent-capability-types';
import { capabilityRegistry } from '@/services/ai/capability-registry';
import { lucentEventBus } from '@/services/ai/event-bus';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

async function createBudget(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ created: boolean }>> {
  const { category, monthlyLimit } = params;

  try {
    const docRef = doc(collection(db, 'budget_categories'));
    await setDoc(docRef, {
      id: docRef.id,
      category,
      monthly_limit: Number(monthlyLimit),
      user_id: ctx.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    ctx.invalidateQueries?.(['enhanced_budgets', 'budgets']);
    lucentEventBus.emit('budget:created', { category, limit: Number(monthlyLimit) }, 'budget-service');

    return { success: true, data: { created: true }, source: 'budgets', timestamp: Date.now() };
  } catch (err: any) {
    return { success: false, error: err.message, source: 'budgets', timestamp: Date.now() };
  }
}

async function updateBudget(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ updated: boolean }>> {
  const { id, monthlyLimit } = params;

  try {
    await updateDoc(doc(db, 'budget_categories', id), {
      monthly_limit: Number(monthlyLimit),
      updated_at: new Date().toISOString()
    });

    ctx.invalidateQueries?.(['enhanced_budgets', 'budgets']);
    lucentEventBus.emit('budget:updated', { id, limit: Number(monthlyLimit) }, 'budget-service');

    return { success: true, data: { updated: true }, source: 'budgets', timestamp: Date.now() };
  } catch (err: any) {
    return { success: false, error: err.message, source: 'budgets', timestamp: Date.now() };
  }
}

async function deleteBudget(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ deleted: boolean }>> {
  const { id } = params;

  try {
    await deleteDoc(doc(db, 'budget_categories', id));

    ctx.invalidateQueries?.(['enhanced_budgets', 'budgets']);
    lucentEventBus.emit('budget:deleted', { id }, 'budget-service');

    return { success: true, data: { deleted: true }, source: 'budgets', timestamp: Date.now() };
  } catch (err: any) {
    return { success: false, error: err.message, source: 'budgets', timestamp: Date.now() };
  }
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

// ─── Read tools ──────────────────────────────────────────────────────────────

function getBudgets(
  _params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<BudgetStatus[]>> {
  try {
    const budgets = enhancedOfflineManager.getBudgets() as any[];
    const allTxns = enhancedOfflineManager.getTransactions();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthDebits = allTxns.filter(t => t.date?.startsWith(currentMonth) && t.type === 'debit');

    const spentByCategory: Record<string, number> = {};
    monthDebits.forEach(t => {
      spentByCategory[t.category] = (spentByCategory[t.category] || 0) + Number(t.amount);
    });

    const data: BudgetStatus[] = budgets.map(b => {
      const limit = Number(b.monthly_limit ?? b.limit ?? 0);
      const spent = spentByCategory[b.category] || 0;
      const percentUsed = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      return {
        category: b.category,
        limit,
        spent,
        percentUsed,
        remaining: limit - spent,
        status: percentUsed > 100 ? 'over' : percentUsed >= 80 ? 'warning' : 'ok',
      };
    });

    return Promise.resolve({ success: true, data, source: 'budgets', timestamp: Date.now() });
  } catch (err: any) {
    return Promise.resolve({ success: false, error: err.message, source: 'budgets', timestamp: Date.now() });
  }
}

async function getBudgetStatus(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<BudgetStatus | null>> {
  const result = await getBudgets(params, ctx);

  if (!result.success) {
    return { success: false, error: result.error, source: 'budgets', timestamp: Date.now() };
  }

  const wanted = String(params.category || '').toLowerCase();
  const match = (result.data || []).find(b => b.category.toLowerCase() === wanted) || null;

  return { success: true, data: match, source: 'budgets', timestamp: Date.now() };
}

async function getBudgetHealth(
  _params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ score: number; overBudgetCount: number; onTrackCount: number; totalBudgeted: number; totalSpent: number }>> {
  const result = await getBudgets(_params, ctx);

  if (!result.success) {
    return { success: false, error: result.error, source: 'budgets', timestamp: Date.now() };
  }

  const data = result.data || [];
  const overBudgetCount = data.filter(b => b.status === 'over').length;
  const onTrackCount = data.filter(b => b.status === 'ok').length;
  const totalBudgeted = data.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = data.reduce((sum, b) => sum + b.spent, 0);
  const score = totalBudgeted > 0
    ? Math.max(0, Math.round(100 - (totalSpent / totalBudgeted) * 100))
    : 0;

  return {
    success: true,
    data: { score, overBudgetCount, onTrackCount, totalBudgeted, totalSpent },
    source: 'budgets',
    timestamp: Date.now(),
  };
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

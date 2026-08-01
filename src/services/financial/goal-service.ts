/**
 * Goal Service
 *
 * Wraps savings goal operations and registers them as tools.
 * Data source: enhancedOfflineManager.getSavings() + Supabase savings_goals table.
 */

import type {
  ToolResult,
  ExecutionContext,
  GoalProgress,
} from '@/types/lucent-capability-types';
import { capabilityRegistry } from '@/services/ai/capability-registry';
import { lucentEventBus } from '@/services/ai/event-bus';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';
import { supabase } from '@/integrations/supabase/client';

// ─── Service Functions ───────────────────────────────────────────────────────

function getGoals(
  _params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<GoalProgress[]>> {
  const savings = enhancedOfflineManager.getSavings();

  const goals: GoalProgress[] = savings.map((g: any) => {
    const target = Number(g.target_amount || 0);
    const current = Number(g.current_amount || 0);
    const percentComplete = target > 0 ? Math.round((current / target) * 100) : 0;

    const allTxns = enhancedOfflineManager.getTransactions();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlySavings = allTxns
      .filter(t => t.date?.startsWith(currentMonth) && t.type === 'savings')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const remaining = Math.max(0, target - current);
    const monthsToGoal = monthlySavings > 0 ? Math.ceil(remaining / monthlySavings) : null;

    return {
      id: g.id,
      category: g.category || 'General Savings',
      targetAmount: target,
      currentAmount: current,
      percentComplete,
      monthsToGoal,
    };
  });

  return Promise.resolve({
    success: true,
    data: goals,
    source: 'goals',
    timestamp: Date.now(),
  });
}

function getGoalProgress(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<GoalProgress | null>> {
  return getGoals({}, ctx).then(result => {
    const match = result.data?.find(g =>
      g.category.toLowerCase().includes((params.goalName || '').toLowerCase()) ||
      g.id === params.id
    );
    return {
      success: true,
      data: match || null,
      source: 'goals',
      timestamp: Date.now(),
    };
  });
}

function forecastGoal(
  params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ targetAmount: number; currentAmount: number; monthlySavingsRate: number; monthsToGoal: number | null; projectedDate: string | null }>> {
  const { targetAmount, monthlySavingsRate } = params;
  const target = Number(targetAmount || 0);
  const monthlyRate = Number(monthlySavingsRate || 0);

  const allTxns = enhancedOfflineManager.getTransactions();
  const totalSavings = allTxns
    .filter(t => t.type === 'savings')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const remaining = Math.max(0, target - totalSavings);
  const monthsToGoal = monthlyRate > 0 ? Math.ceil(remaining / monthlyRate) : null;

  let projectedDate: string | null = null;
  if (monthsToGoal !== null) {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsToGoal);
    projectedDate = d.toISOString().split('T')[0];
  }

  return Promise.resolve({
    success: true,
    data: {
      targetAmount: target,
      currentAmount: totalSavings,
      monthlySavingsRate: monthlyRate,
      monthsToGoal,
      projectedDate,
    },
    source: 'goals',
    timestamp: Date.now(),
  });
}

async function createGoal(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ created: boolean }>> {
  const { category, targetAmount, targetDate } = params;

  const { error } = await supabase
    .from('savings_goals' as any)
    .insert({
      category: category || 'General Savings',
      target_amount: Number(targetAmount),
      current_amount: 0,
      target_date: targetDate || null,
      user_id: ctx.userId,
    });

  if (error) {
    return { success: false, error: error.message, source: 'goals', timestamp: Date.now() };
  }

  ctx.invalidateQueries?.(['savings_goals']);
  lucentEventBus.emit('goal:created', { category, targetAmount: Number(targetAmount) }, 'goal-service');

  return { success: true, data: { created: true }, source: 'goals', timestamp: Date.now() };
}

async function addToGoal(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ updated: boolean; newCurrentAmount: number }>> {
  const { goalName, id, amount } = params;
  const savings = enhancedOfflineManager.getSavings();
  const goal = savings.find((g: any) =>
    g.id === id || g.category?.toLowerCase().includes((goalName || '').toLowerCase())
  );

  if (!goal) {
    return { success: false, error: `Goal "${goalName || id}" not found`, source: 'goals', timestamp: Date.now() };
  }

  const newAmount = Number(goal.current_amount || 0) + Number(amount);
  const { error } = await supabase
    .from('savings_goals' as any)
    .update({ current_amount: newAmount })
    .eq('id', goal.id)
    .eq('user_id', ctx.userId);

  if (error) {
    return { success: false, error: error.message, source: 'goals', timestamp: Date.now() };
  }

  ctx.invalidateQueries?.(['savings_goals']);
  lucentEventBus.emit('goal:updated', { id: goal.id, current_amount: newAmount }, 'goal-service');

  return { success: true, data: { updated: true, newCurrentAmount: newAmount }, source: 'goals', timestamp: Date.now() };
}

async function withdrawFromGoal(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ updated: boolean; newCurrentAmount: number }>> {
  const { goalName, id, amount } = params;
  const savings = enhancedOfflineManager.getSavings();
  const goal = savings.find((g: any) =>
    g.id === id || g.category?.toLowerCase().includes((goalName || '').toLowerCase())
  );

  if (!goal) {
    return { success: false, error: `Goal "${goalName || id}" not found`, source: 'goals', timestamp: Date.now() };
  }

  const newAmount = Math.max(0, Number(goal.current_amount || 0) - Number(amount));
  const { error } = await supabase
    .from('savings_goals' as any)
    .update({ current_amount: newAmount })
    .eq('id', goal.id)
    .eq('user_id', ctx.userId);

  if (error) {
    return { success: false, error: error.message, source: 'goals', timestamp: Date.now() };
  }

  ctx.invalidateQueries?.(['savings_goals']);
  lucentEventBus.emit('goal:updated', { id: goal.id, current_amount: newAmount }, 'goal-service');

  return { success: true, data: { updated: true, newCurrentAmount: newAmount }, source: 'goals', timestamp: Date.now() };
}

async function deleteGoal(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ deleted: boolean }>> {
  const { id } = params;

  const { error } = await supabase
    .from('savings_goals' as any)
    .delete()
    .eq('id', id)
    .eq('user_id', ctx.userId);

  if (error) {
    return { success: false, error: error.message, source: 'goals', timestamp: Date.now() };
  }

  ctx.invalidateQueries?.(['savings_goals']);
  lucentEventBus.emit('goal:deleted', { id }, 'goal-service');

  return { success: true, data: { deleted: true }, source: 'goals', timestamp: Date.now() };
}

async function updateGoal(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ updated: boolean }>> {
  const { id, targetAmount, currentAmount } = params;
  const updates: Record<string, any> = {};
  if (targetAmount !== undefined) updates.target_amount = Number(targetAmount);
  if (currentAmount !== undefined) updates.current_amount = Number(currentAmount);

  const { error } = await supabase
    .from('savings_goals' as any)
    .update(updates)
    .eq('id', id)
    .eq('user_id', ctx.userId);

  if (error) {
    return { success: false, error: error.message, source: 'goals', timestamp: Date.now() };
  }

  ctx.invalidateQueries?.(['savings_goals']);
  lucentEventBus.emit('goal:updated', { id, ...updates }, 'goal-service');

  return { success: true, data: { updated: true }, source: 'goals', timestamp: Date.now() };
}

// ─── Registration ────────────────────────────────────────────────────────────

export function registerGoalService(): void {
  capabilityRegistry.registerModule({
    id: 'goals',
    name: 'Goal Service',
    description: 'Manages savings goals: creating, tracking progress, depositing, withdrawing, and forecasting when goals will be reached.',
    toolNames: ['getGoals', 'getGoalProgress', 'forecastGoal', 'createGoal', 'updateGoal', 'addToGoal', 'withdrawFromGoal', 'deleteGoal'],
    version: '1.1.0',
  });

  capabilityRegistry.registerTool({
    name: 'getGoals',
    description: 'Get all savings goals with progress: target amount, current amount, percent complete, and estimated months to reach the goal.',
    module: 'goals',
    inputSchema: {},
    outputDescription: 'Array of { id, category, targetAmount, currentAmount, percentComplete, monthsToGoal }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getGoals);

  capabilityRegistry.registerTool({
    name: 'getGoalProgress',
    description: 'Get progress for a specific savings goal by name or ID.',
    module: 'goals',
    inputSchema: {
      goalName: { type: 'string', description: 'Goal name to search for', required: false },
      id: { type: 'string', description: 'Goal ID', required: false },
    },
    outputDescription: '{ id, category, targetAmount, currentAmount, percentComplete, monthsToGoal } or null',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getGoalProgress);

  capabilityRegistry.registerTool({
    name: 'forecastGoal',
    description: 'Forecast when a savings goal will be reached based on target amount and monthly savings rate.',
    module: 'goals',
    inputSchema: {
      targetAmount: { type: 'number', description: 'Target savings amount', required: true },
      monthlySavingsRate: { type: 'number', description: 'Monthly savings contribution amount', required: true },
    },
    outputDescription: '{ targetAmount, currentAmount, monthlySavingsRate, monthsToGoal, projectedDate }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: false,
  }, forecastGoal);

  capabilityRegistry.registerTool({
    name: 'createGoal',
    description: 'Create a new savings goal with a target amount.',
    module: 'goals',
    inputSchema: {
      category: { type: 'string', description: 'Goal name (e.g., "Vacation Fund", "Emergency Fund")', required: true },
      targetAmount: { type: 'number', description: 'Target amount to save', required: true },
      targetDate: { type: 'date', description: 'Target date to reach the goal (optional)', required: false },
    },
    outputDescription: '{ created: boolean }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, createGoal);

  capabilityRegistry.registerTool({
    name: 'addToGoal',
    description: 'Deposit funds toward an active savings goal.',
    module: 'goals',
    inputSchema: {
      goalName: { type: 'string', description: 'Name of the goal', required: false },
      id: { type: 'string', description: 'Goal ID', required: false },
      amount: { type: 'number', description: 'Amount to add to goal', required: true },
    },
    outputDescription: '{ updated: boolean, newCurrentAmount: number }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, addToGoal);

  capabilityRegistry.registerTool({
    name: 'withdrawFromGoal',
    description: 'Withdraw funds from an active savings goal.',
    module: 'goals',
    inputSchema: {
      goalName: { type: 'string', description: 'Name of the goal', required: false },
      id: { type: 'string', description: 'Goal ID', required: false },
      amount: { type: 'number', description: 'Amount to withdraw', required: true },
    },
    outputDescription: '{ updated: boolean, newCurrentAmount: number }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, withdrawFromGoal);

  capabilityRegistry.registerTool({
    name: 'deleteGoal',
    description: 'Delete a savings goal permanently.',
    module: 'goals',
    inputSchema: {
      id: { type: 'string', description: 'Goal ID to delete', required: true },
    },
    outputDescription: '{ deleted: boolean }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, deleteGoal);

  capabilityRegistry.registerTool({
    name: 'updateGoal',
    description: 'Update a savings goal target or current amount.',
    module: 'goals',
    inputSchema: {
      id: { type: 'string', description: 'Goal ID to update', required: true },
      targetAmount: { type: 'number', description: 'New target amount', required: false },
      currentAmount: { type: 'number', description: 'New current amount', required: false },
    },
    outputDescription: '{ updated: boolean }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, updateGoal);
}

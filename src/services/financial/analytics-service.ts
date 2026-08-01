/**
 * Analytics Service
 *
 * Pure computation tools — reads cached data, returns analytical insights.
 * No database calls. Wraps InsightsRepository and TimelineAnalyzer.
 */

import type {
  ToolResult,
  ExecutionContext,
} from '@/types/lucent-capability-types';
import { capabilityRegistry } from '@/services/ai/capability-registry';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';

// ─── Service Functions ───────────────────────────────────────────────────────

function getExpenseTrend(
  params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ category: string; thisMonth: number; lastMonth: number; changePercent: number }[]>> {
  const allTxns = enhancedOfflineManager.getTransactions();
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.toISOString().slice(0, 7);

  const thisTxns = allTxns.filter(t => t.date?.startsWith(thisMonth) && t.type === 'debit');
  const lastTxns = allTxns.filter(t => t.date?.startsWith(lastMonth) && t.type === 'debit');

  // Get unique categories
  const categories = new Set([...thisTxns.map(t => t.category), ...lastTxns.map(t => t.category)]);

  const trends = Array.from(categories).map(cat => {
    const thisTotal = thisTxns.filter(t => t.category === cat).reduce((s, t) => s + Number(t.amount), 0);
    const lastTotal = lastTxns.filter(t => t.category === cat).reduce((s, t) => s + Number(t.amount), 0);
    const changePercent = lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : (thisTotal > 0 ? 100 : 0);

    return { category: cat, thisMonth: thisTotal, lastMonth: lastTotal, changePercent };
  }).sort((a, b) => b.thisMonth - a.thisMonth);

  return Promise.resolve({
    success: true,
    data: trends,
    source: 'analytics',
    timestamp: Date.now(),
  });
}

function getTopCategories(
  params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ category: string; total: number; percentage: number }[]>> {
  const limit = params.limit || 5;
  const allTxns = enhancedOfflineManager.getTransactions();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthDebits = allTxns.filter(t => t.date?.startsWith(currentMonth) && t.type === 'debit');

  const totals: Record<string, number> = {};
  monthDebits.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + Number(t.amount);
  });

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

  const ranked = Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([category, total]) => ({
      category,
      total,
      percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
    }));

  return Promise.resolve({
    success: true,
    data: ranked,
    source: 'analytics',
    timestamp: Date.now(),
  });
}

function getSpendingComparison(
  _params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ thisMonth: number; lastMonth: number; changePercent: number; topIncrease: string | null; topDecrease: string | null }>> {
  const allTxns = enhancedOfflineManager.getTransactions();
  const now = new Date();
  const thisMonthStr = now.toISOString().slice(0, 7);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = lastMonthDate.toISOString().slice(0, 7);

  const thisTotal = allTxns.filter(t => t.date?.startsWith(thisMonthStr) && t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0);
  const lastTotal = allTxns.filter(t => t.date?.startsWith(lastMonthStr) && t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0);
  const changePercent = lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : 0;

  // Find top increase/decrease categories
  const categories = new Set(allTxns.filter(t => t.type === 'debit').map(t => t.category));
  let topIncrease: { cat: string; diff: number } | null = null;
  let topDecrease: { cat: string; diff: number } | null = null;

  categories.forEach(cat => {
    const thisAmt = allTxns.filter(t => t.date?.startsWith(thisMonthStr) && t.type === 'debit' && t.category === cat).reduce((s, t) => s + Number(t.amount), 0);
    const lastAmt = allTxns.filter(t => t.date?.startsWith(lastMonthStr) && t.type === 'debit' && t.category === cat).reduce((s, t) => s + Number(t.amount), 0);
    const diff = thisAmt - lastAmt;
    if (!topIncrease || diff > topIncrease.diff) topIncrease = { cat, diff };
    if (!topDecrease || diff < topDecrease.diff) topDecrease = { cat, diff };
  });

  return Promise.resolve({
    success: true,
    data: {
      thisMonth: thisTotal,
      lastMonth: lastTotal,
      changePercent,
      topIncrease: topIncrease?.cat || null,
      topDecrease: topDecrease?.cat || null,
    },
    source: 'analytics',
    timestamp: Date.now(),
  });
}

function getFinancialHealth(
  _params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ savingsRate: number; budgetAdherence: number; healthScore: number; grade: string }>> {
  const allTxns = enhancedOfflineManager.getTransactions();
  const budgets = enhancedOfflineManager.getBudgets();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthTxns = allTxns.filter(t => t.date?.startsWith(currentMonth));

  const income = monthTxns.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = monthTxns.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0);
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

  // Budget adherence: % of budgets that are on track
  const budgetStatuses = budgets.map((b: any) => {
    const spent = monthTxns.filter(t => t.type === 'debit' && t.category === b.category).reduce((s, t) => s + Number(t.amount), 0);
    return spent <= Number(b.monthly_limit || 0);
  });
  const budgetAdherence = budgetStatuses.length > 0
    ? Math.round((budgetStatuses.filter(Boolean).length / budgetStatuses.length) * 100)
    : 100;

  // Composite health score
  const healthScore = Math.round((savingsRate * 0.5 + budgetAdherence * 0.5));
  const grade = healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : healthScore >= 20 ? 'D' : 'F';

  return Promise.resolve({
    success: true,
    data: { savingsRate, budgetAdherence, healthScore, grade },
    source: 'analytics',
    timestamp: Date.now(),
  });
}

function simulateScenario(
  params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ currentSurplus: number; projectedSurplus: number; oneYearDiff: number; description: string }>> {
  const adjustmentAmount = Number(params.adjustmentAmount || 0);
  const allTxns = enhancedOfflineManager.getTransactions();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthTxns = allTxns.filter(t => t.date?.startsWith(currentMonth));

  const income = monthTxns.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = monthTxns.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0);

  const currentSurplus = income - expenses;
  const projectedSurplus = currentSurplus + adjustmentAmount;
  const oneYearDiff = adjustmentAmount * 12;

  const direction = adjustmentAmount >= 0 ? 'saving' : 'spending';
  const description = `If you ${adjustmentAmount >= 0 ? 'save' : 'cut'} ${Math.abs(adjustmentAmount).toLocaleString()} more per month, you'll have ${Math.abs(oneYearDiff).toLocaleString()} ${adjustmentAmount >= 0 ? 'extra' : 'less'} in 12 months.`;

  return Promise.resolve({
    success: true,
    data: { currentSurplus, projectedSurplus, oneYearDiff, description },
    source: 'analytics',
    timestamp: Date.now(),
  });
}

function getIncomeSources(
  _params: Record<string, any>,
  _ctx: ExecutionContext,
): Promise<ToolResult<{ source: string; total: number; percentage: number }[]>> {
  const allTxns = enhancedOfflineManager.getTransactions();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const incomes = allTxns.filter(t => t.date?.startsWith(currentMonth) && t.type === 'credit');

  const totals: Record<string, number> = {};
  incomes.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + Number(t.amount);
  });

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

  const sources = Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .map(([source, total]) => ({
      source,
      total,
      percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
    }));

  return Promise.resolve({
    success: true,
    data: sources,
    source: 'analytics',
    timestamp: Date.now(),
  });
}

// ─── Registration ────────────────────────────────────────────────────────────

export function registerAnalyticsService(): void {
  capabilityRegistry.registerModule({
    id: 'analytics',
    name: 'Analytics Service',
    description: 'Financial analytics: spending trends, category breakdowns, health scoring, comparisons, and what-if simulations.',
    toolNames: ['getExpenseTrend', 'getTopCategories', 'getSpendingComparison', 'getFinancialHealth', 'simulateScenario', 'getIncomeSources'],
    version: '1.0.0',
  });

  capabilityRegistry.registerTool({
    name: 'getExpenseTrend',
    description: 'Compare spending by category between this month and last month. Shows amount and percentage change.',
    module: 'analytics',
    inputSchema: {},
    outputDescription: 'Array of { category, thisMonth, lastMonth, changePercent }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getExpenseTrend);

  capabilityRegistry.registerTool({
    name: 'getTopCategories',
    description: 'Get the top spending categories ranked by amount this month.',
    module: 'analytics',
    inputSchema: {
      limit: { type: 'number', description: 'Number of top categories (default: 5)', required: false },
    },
    outputDescription: 'Array of { category, total, percentage }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getTopCategories);

  capabilityRegistry.registerTool({
    name: 'getSpendingComparison',
    description: 'Compare total spending this month vs last month. Identifies top increase and decrease categories.',
    module: 'analytics',
    inputSchema: {},
    outputDescription: '{ thisMonth, lastMonth, changePercent, topIncrease, topDecrease }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getSpendingComparison);

  capabilityRegistry.registerTool({
    name: 'getFinancialHealth',
    description: 'Calculate a composite financial health score (0-100) based on savings rate and budget adherence. Returns a letter grade (A-F).',
    module: 'analytics',
    inputSchema: {},
    outputDescription: '{ savingsRate, budgetAdherence, healthScore, grade }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getFinancialHealth);

  capabilityRegistry.registerTool({
    name: 'simulateScenario',
    description: 'What-if scenario: project the impact of saving or cutting a given amount per month over 12 months.',
    module: 'analytics',
    inputSchema: {
      adjustmentAmount: { type: 'number', description: 'Monthly amount to save (positive) or cut (negative)', required: true },
    },
    outputDescription: '{ currentSurplus, projectedSurplus, oneYearDiff, description }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: false,
  }, simulateScenario);

  capabilityRegistry.registerTool({
    name: 'getIncomeSources',
    description: 'Break down income by source/category for the current month.',
    module: 'analytics',
    inputSchema: {},
    outputDescription: 'Array of { source, total, percentage }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getIncomeSources);
}

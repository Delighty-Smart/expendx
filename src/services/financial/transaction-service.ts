/**
 * Transaction Service
 *
 * Wraps all transaction data operations and registers them as tools
 * in the Capability Registry. The AI invokes these tools through
 * the orchestrator — it never touches enhancedOfflineManager directly.
 *
 * Data source: enhancedOfflineManager (which handles Firestore + IndexedDB)
 */

import type {
  ToolResult,
  ExecutionContext,
  TransactionSummary,
  MonthlySummary,
} from '@/types/lucent-capability-types';
import { capabilityRegistry } from '@/services/ai/capability-registry';
import { lucentEventBus } from '@/services/ai/event-bus';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';
import type { Transaction } from '@/types/transactions';

// ─── Service Functions ───────────────────────────────────────────────────────

function getRecentTransactions(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<TransactionSummary[]>> {
  const limit = params.limit || 10;
  const allTxns = enhancedOfflineManager.getTransactions();
  const recent = allTxns.slice(0, limit).map(toSummary);

  return Promise.resolve({
    success: true,
    data: recent,
    source: 'transactions',
    timestamp: Date.now(),
  });
}

function getTransactionsByCategory(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ category: string; total: number; count: number; transactions: TransactionSummary[] }>> {
  const { category, period } = params;
  const allTxns = enhancedOfflineManager.getTransactions();

  const dateRange = getDateRange(period);
  const filtered = allTxns.filter(t => {
    const matchCategory = !category || t.category.toLowerCase().includes(category.toLowerCase());
    const matchDate = !dateRange || (t.date >= dateRange.from && t.date <= dateRange.to);
    return matchCategory && matchDate;
  });

  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  return Promise.resolve({
    success: true,
    data: {
      category: category || 'All',
      total,
      count: filtered.length,
      transactions: filtered.slice(0, 20).map(toSummary),
    },
    source: 'transactions',
    timestamp: Date.now(),
  });
}

function getTransactionsByDateRange(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<TransactionSummary[]>> {
  const { startDate, endDate } = params;
  const allTxns = enhancedOfflineManager.getTransactions();

  const filtered = allTxns.filter(t => {
    const afterStart = !startDate || t.date >= startDate;
    const beforeEnd = !endDate || t.date <= endDate;
    return afterStart && beforeEnd;
  });

  return Promise.resolve({
    success: true,
    data: filtered.map(toSummary),
    source: 'transactions',
    timestamp: Date.now(),
  });
}

function searchTransactions(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<TransactionSummary[]>> {
  const query = (params.query || '').toLowerCase();
  const allTxns = enhancedOfflineManager.getTransactions();

  const matches = allTxns.filter(t =>
    t.description.toLowerCase().includes(query) ||
    t.category.toLowerCase().includes(query)
  );

  return Promise.resolve({
    success: true,
    data: matches.slice(0, 20).map(toSummary),
    source: 'transactions',
    timestamp: Date.now(),
  });
}

function getMonthlySummary(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<MonthlySummary>> {
  const month = params.month || new Date().toISOString().slice(0, 7); // YYYY-MM
  const allTxns = enhancedOfflineManager.getTransactions();

  const monthTxns = allTxns.filter(t => t.date && t.date.startsWith(month));

  const monthlyIncome = monthTxns
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = monthTxns
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSavings = monthTxns
    .filter(t => t.type === 'savings')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0
    ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
    : 0;

  // Get budget total from budget service data
  const budgets = enhancedOfflineManager.getBudgets();
  const monthlyBudget = budgets.reduce((sum: number, b: any) => sum + Number(b.monthly_limit || 0), 0);

  const summary = enhancedOfflineManager.getTransactionSummary();
  const totalBalance = summary.balance;

  return Promise.resolve({
    success: true,
    data: {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      netBalance,
      savingsRate,
      totalSavings,
      monthlyBudget,
    },
    source: 'transactions',
    timestamp: Date.now(),
  });
}

async function addTransaction(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ transactionId: string }>> {
  const { amount, type, category, description, date } = params;

  const txDate = date || new Date().toISOString().split('T')[0];
  const txCategory = category || (type === 'credit' ? 'Salary Wages' : type === 'savings' ? 'Goal Savings' : 'General');
  const txDescription = description || txCategory;

  const transactionData: Omit<Transaction, 'id'> = {
    user_id: ctx.userId,
    amount: Number(amount),
    type: type || 'debit',
    category: txCategory,
    description: txDescription,
    date: txDate,
    archived: false,
  };

  const id = await enhancedOfflineManager.addTransactionOffline(transactionData);

  // Invalidate React Query cache
  ctx.invalidateQueries?.(['transactions']);

  // Emit event for context freshness
  lucentEventBus.emit('transaction:added', {
    id,
    amount: Number(amount),
    type: type || 'debit',
    category: txCategory,
    description: txDescription,
    date: txDate,
  }, 'transaction-service');

  return {
    success: true,
    data: { transactionId: id },
    source: 'transactions',
    timestamp: Date.now(),
  };
}

async function updateTransaction(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ updated: boolean }>> {
  const { id, ...updates } = params;

  await enhancedOfflineManager.updateTransactionOffline(id, updates);
  ctx.invalidateQueries?.(['transactions']);

  lucentEventBus.emit('transaction:updated', { id, changes: updates }, 'transaction-service');

  return {
    success: true,
    data: { updated: true },
    source: 'transactions',
    timestamp: Date.now(),
  };
}

async function deleteTransaction(
  params: Record<string, any>,
  ctx: ExecutionContext,
): Promise<ToolResult<{ deleted: boolean }>> {
  const { id } = params;

  await enhancedOfflineManager.deleteTransactionOffline(id);
  ctx.invalidateQueries?.(['transactions']);

  lucentEventBus.emit('transaction:deleted', { id }, 'transaction-service');

  return {
    success: true,
    data: { deleted: true },
    source: 'transactions',
    timestamp: Date.now(),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSummary(t: Transaction): TransactionSummary {
  return {
    amount: Number(t.amount),
    type: t.type === 'subscription' ? 'debit' : t.type as 'credit' | 'debit' | 'savings',
    category: t.category,
    description: t.description,
    date: t.date,
  };
}

function getDateRange(period?: string): { from: string; to: string } | null {
  if (!period) return null;
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (period) {
    case 'today':
      return { from: today, to: today };
    case 'this_week': {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return { from: weekStart.toISOString().split('T')[0], to: today };
    }
    case 'this_month':
      return { from: now.toISOString().slice(0, 7) + '-01', to: today };
    case 'last_month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: lastMonth.toISOString().split('T')[0],
        to: lastMonthEnd.toISOString().split('T')[0],
      };
    }
    case 'this_year':
      return { from: `${now.getFullYear()}-01-01`, to: today };
    default:
      return null;
  }
}

// ─── Registration ────────────────────────────────────────────────────────────

/** Register all transaction tools with the Capability Registry */
export function registerTransactionService(): void {
  capabilityRegistry.registerModule({
    id: 'transactions',
    name: 'Transaction Service',
    description: 'Manages financial transactions: logging, querying, searching, and monthly summaries.',
    toolNames: [
      'getRecentTransactions', 'getTransactionsByCategory', 'getTransactionsByDateRange',
      'searchTransactions', 'getMonthlySummary', 'addTransaction', 'updateTransaction', 'deleteTransaction',
    ],
    version: '1.0.0',
  });

  capabilityRegistry.registerTool({
    name: 'getRecentTransactions',
    description: 'Get the most recent transactions. Returns a list of transactions with amount, type, category, description, and date.',
    module: 'transactions',
    inputSchema: {
      limit: { type: 'number', description: 'Maximum number of transactions to return (default: 10)', required: false },
    },
    outputDescription: 'Array of TransactionSummary objects',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getRecentTransactions);

  capabilityRegistry.registerTool({
    name: 'getTransactionsByCategory',
    description: 'Get transactions filtered by category and/or time period. Returns total amount, count, and individual transactions.',
    module: 'transactions',
    inputSchema: {
      category: { type: 'string', description: 'Category name to filter (e.g., "Groceries Food", "Fuel Transport")', required: false },
      period: { type: 'enum', description: 'Time period', required: false, enumValues: ['today', 'this_week', 'this_month', 'last_month', 'this_year'] },
    },
    outputDescription: '{ category, total, count, transactions[] }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getTransactionsByCategory);

  capabilityRegistry.registerTool({
    name: 'getTransactionsByDateRange',
    description: 'Get transactions within a specific date range.',
    module: 'transactions',
    inputSchema: {
      startDate: { type: 'date', description: 'Start date (YYYY-MM-DD)', required: false },
      endDate: { type: 'date', description: 'End date (YYYY-MM-DD)', required: false },
    },
    outputDescription: 'Array of TransactionSummary objects',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getTransactionsByDateRange);

  capabilityRegistry.registerTool({
    name: 'searchTransactions',
    description: 'Free-text search across transaction descriptions and categories.',
    module: 'transactions',
    inputSchema: {
      query: { type: 'string', description: 'Search term', required: true },
    },
    outputDescription: 'Array of matching TransactionSummary objects',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, searchTransactions);

  capabilityRegistry.registerTool({
    name: 'getMonthlySummary',
    description: 'Get financial summary for a month: income, expenses, net balance, savings rate, total savings, and total budget.',
    module: 'transactions',
    inputSchema: {
      month: { type: 'string', description: 'Month in YYYY-MM format (default: current month)', required: false },
    },
    outputDescription: '{ monthlyIncome, monthlyExpenses, netBalance, savingsRate, totalSavings, monthlyBudget }',
    accessLevel: 'read',
    requiresConfirmation: false,
    requiresAuth: true,
  }, getMonthlySummary);

  capabilityRegistry.registerTool({
    name: 'addTransaction',
    description: 'Log a new financial transaction (expense, income, or savings). This modifies the user\'s financial data.',
    module: 'transactions',
    inputSchema: {
      amount: { type: 'number', description: 'Transaction amount', required: true },
      type: { type: 'enum', description: 'Transaction type', required: true, enumValues: ['debit', 'credit', 'savings'] },
      category: { type: 'string', description: 'Category (e.g., "Groceries Food")', required: false },
      description: { type: 'string', description: 'Description of the transaction', required: false },
      date: { type: 'date', description: 'Transaction date (YYYY-MM-DD, default: today)', required: false },
    },
    outputDescription: '{ transactionId }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, addTransaction);

  capabilityRegistry.registerTool({
    name: 'updateTransaction',
    description: 'Update an existing transaction.',
    module: 'transactions',
    inputSchema: {
      id: { type: 'string', description: 'Transaction ID to update', required: true },
      amount: { type: 'number', description: 'New amount', required: false },
      category: { type: 'string', description: 'New category', required: false },
      description: { type: 'string', description: 'New description', required: false },
    },
    outputDescription: '{ updated: boolean }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, updateTransaction);

  capabilityRegistry.registerTool({
    name: 'deleteTransaction',
    description: 'Delete a transaction permanently.',
    module: 'transactions',
    inputSchema: {
      id: { type: 'string', description: 'Transaction ID to delete', required: true },
    },
    outputDescription: '{ deleted: boolean }',
    accessLevel: 'write',
    requiresConfirmation: true,
    requiresAuth: true,
  }, deleteTransaction);
}

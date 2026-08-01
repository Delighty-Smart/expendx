import type { ParsedIntent, ActionResult, ChatAttachment, FinancialContext } from '@/types/ai-types';
import { capabilityRegistry } from '@/services/ai/capability-registry';

interface DispatchDeps {
  userId: string;
  context: FinancialContext;
  invalidateQueries: (keys: string[]) => void;
}

export async function dispatchAction(
  intent: ParsedIntent,
  deps: DispatchDeps
): Promise<ActionResult> {
  const { userId, context, invalidateQueries } = deps;
  const execCtx = { userId, currency: context.currency, invalidateQueries };

  try {
    switch (intent.type) {
      case 'log_expense':
      case 'log_income':
      case 'log_savings': {
        const type = intent.type === 'log_expense' ? 'debit' : intent.type === 'log_income' ? 'credit' : 'savings';
        const res = await capabilityRegistry.executeTool('addTransaction', {
          amount: intent.entities.amount,
          type,
          category: intent.entities.category,
          description: intent.entities.description,
          date: intent.entities.date,
        }, execCtx);

        if (res.success) {
          const emoji = type === 'credit' ? '💰' : type === 'savings' ? '🎯' : '✅';
          const typeLabel = type === 'credit' ? 'income' : type === 'savings' ? 'savings' : 'expense';
          const category = intent.entities.category || (type === 'credit' ? 'Salary Wages' : type === 'savings' ? 'Goal Savings' : 'General');
          
          return {
            success: true,
            message: `${emoji} Logged ${context.currency.symbol}${Number(intent.entities.amount).toLocaleString()} ${typeLabel} for ${category}.`,
            data: res.data,
            attachments: [{
              type: 'transaction_created',
              data: {
                id: res.data?.transactionId,
                amount: intent.entities.amount,
                type,
                category,
                description: intent.entities.description || category,
                date: intent.entities.date || new Date().toISOString().split('T')[0],
                currency: context.currency,
              }
            }]
          };
        }
        return { success: false, message: res.error || 'Failed to log transaction.' };
      }

      case 'query_balance': {
        const res = await capabilityRegistry.executeTool('getMonthlySummary', {}, execCtx);
        if (res.success && res.data) {
          const { totalBalance, monthlyIncome, monthlyExpenses, totalSavings } = res.data;
          const net = monthlyIncome - monthlyExpenses;
          return {
            success: true,
            message: `💳 **Total Balance: ${context.currency.symbol}${(totalBalance || 0).toLocaleString()}**\n\n` +
              `**This Month's Summary:**\n` +
              `• **Income:** ${context.currency.symbol}${monthlyIncome.toLocaleString()}\n` +
              `• **Expenses:** ${context.currency.symbol}${monthlyExpenses.toLocaleString()}\n` +
              `• **Net Income:** ${context.currency.symbol}${Math.abs(net).toLocaleString()} ${net >= 0 ? 'surplus' : 'deficit'}\n` +
              (totalSavings > 0 ? `• **Total Savings:** ${context.currency.symbol}${totalSavings.toLocaleString()}` : ''),
            attachments: [{ type: 'budget_summary', data: { totalBalance, income: monthlyIncome, expenses: monthlyExpenses, net, savings: totalSavings } }],
          };
        }
        return { success: false, message: 'Could not fetch balance summary.' };
      }

      case 'query_spending': {
        const res = await capabilityRegistry.executeTool('getTopCategories', { limit: 6 }, execCtx);
        const categories = res.data || [];
        const total = categories.reduce((s: number, c: any) => s + c.total, 0);
        const list = categories.map((c: any) => `• ${c.category}: ${context.currency.symbol}${c.total.toLocaleString()}`).join('\n');
        return {
          success: true,
          message: `📊 Total spending this month: **${context.currency.symbol}${total.toLocaleString()}**\n\n${list || 'No spending recorded.'}`,
        };
      }

      case 'query_budget': {
        const res = await capabilityRegistry.executeTool('getBudgets', {}, execCtx);
        const budgets = res.data || [];
        if (budgets.length === 0) {
          return { success: true, message: "You don't have any budgets set up yet. Want me to help you create one? 📋" };
        }
        const summary = budgets.map((b: any) => {
          const icon = b.status === 'over' ? '🔴' : b.status === 'warning' ? '🟡' : '🟢';
          return `${icon} **${b.category}:** ${context.currency.symbol}${b.spent.toLocaleString()} / ${context.currency.symbol}${b.limit.toLocaleString()} (${b.percentUsed}%)`;
        }).join('\n');
        return { success: true, message: `📋 **Budget Status:**\n\n${summary}` };
      }

      default:
        return {
          success: false,
          message: 'Action handled via intelligence orchestrator.',
        };
    }
  } catch (err: any) {
    return { success: false, message: `Action failed: ${err.message || 'Unknown error'}` };
  }
}


// ─── Transaction Logging ─────────────────────────────────────────────────────

async function logTransaction(
  intent: ParsedIntent,
  userId: string,
  type: 'credit' | 'debit' | 'savings',
  context: FinancialContext,
  invalidateQueries: (keys: string[]) => void
): Promise<ActionResult> {
  const { amount, category, description, date } = intent.entities;

  if (amount === undefined) {
    return { success: false, message: 'I need an amount to log this transaction.' };
  }

  const txDate = date || new Date().toISOString().split('T')[0];
  const txCategory = category || (type === 'credit' ? 'Salary Wages' : type === 'savings' ? 'Goal Savings' : 'General');
  const txDescription = description || txCategory;

  const transactionData: Omit<Transaction, 'id'> = {
    user_id: userId,
    amount,
    type,
    category: txCategory,
    description: txDescription,
    date: txDate,
    archived: false,
  };

  const id = await enhancedOfflineManager.addTransactionOffline(transactionData);
  invalidateQueries(['transactions']);

  const typeLabel = type === 'credit' ? 'income' : type === 'savings' ? 'savings' : 'expense';
  const emoji = type === 'credit' ? '💰' : type === 'savings' ? '🎯' : '✅';

  const attachments: ChatAttachment[] = [{
    type: 'transaction_created',
    data: {
      id,
      amount,
      type,
      category: txCategory,
      description: txDescription,
      date: txDate,
      currency: context.currency,
    }
  }];

  return {
    success: true,
    message: `${emoji} Logged ${context.currency.symbol}${amount.toLocaleString()} ${typeLabel} for ${txCategory}.`,
    data: { transactionId: id, ...transactionData },
    attachments,
  };
}

// ─── Query Operations ────────────────────────────────────────────────────────

function queryBalance(ctx: FinancialContext): ActionResult {
  const { currency, monthlyIncome, monthlyExpenses, totalSavings } = ctx;
  const net = monthlyIncome - monthlyExpenses;
  const summary = enhancedOfflineManager.getTransactionSummary();

  return {
    success: true,
    message: `💳 **Total Balance: ${currency.symbol}${summary.balance.toLocaleString()}**\n\n` +
      `**This Month's Summary:**\n` +
      `• **Income:** ${currency.symbol}${monthlyIncome.toLocaleString()}\n` +
      `• **Expenses:** ${currency.symbol}${monthlyExpenses.toLocaleString()}\n` +
      `• **Net Income:** ${currency.symbol}${Math.abs(net).toLocaleString()} ${net >= 0 ? 'surplus' : 'deficit'}\n` +
      (totalSavings > 0 ? `• **Total Savings:** ${currency.symbol}${totalSavings.toLocaleString()}` : ''),
    attachments: [{
      type: 'budget_summary',
      data: { totalBalance: summary.balance, income: monthlyIncome, expenses: monthlyExpenses, net, savings: totalSavings }
    }],
  };
}

function querySpending(ctx: FinancialContext): ActionResult {
  const { currency, monthlyExpenses, budgets } = ctx;

  const breakdown = budgets
    .filter(b => b.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 6)
    .map(b => `• ${b.category}: ${currency.symbol}${b.spent.toLocaleString()}`)
    .join('\n');

  return {
    success: true,
    message: `📊 Total spending this month: **${currency.symbol}${monthlyExpenses.toLocaleString()}**\n\n${breakdown || 'No spending breakdown available yet.'}`,
    attachments: [{
      type: 'spending_chart',
      data: { total: monthlyExpenses, budgets }
    }],
  };
}

function queryBudget(ctx: FinancialContext): ActionResult {
  const { currency, budgets } = ctx;

  if (budgets.length === 0) {
    return {
      success: true,
      message: "You don't have any budgets set up yet. Want me to help you create one? 📋",
    };
  }

  const summary = budgets.map(b => {
    const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
    const icon = pct > 100 ? '🔴' : pct > 80 ? '🟡' : '🟢';
    return `${icon} **${b.category}:** ${currency.symbol}${b.spent.toLocaleString()} / ${currency.symbol}${b.limit.toLocaleString()} (${pct}%)`;
  }).join('\n');

  return {
    success: true,
    message: `📋 **Budget Status:**\n\n${summary}`,
    attachments: [{
      type: 'budget_summary',
      data: { budgets }
    }],
  };
}

function querySavings(ctx: FinancialContext): ActionResult {
  const { currency, savingsGoals, totalSavings } = ctx;

  if (savingsGoals.length === 0) {
    return {
      success: true,
      message: `💰 Total savings: **${currency.symbol}${totalSavings.toLocaleString()}**\n\nSet a savings goal to track your progress!`,
    };
  }

  const summary = savingsGoals.map(g => {
    const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
    return `🎯 **${g.category}:** ${currency.symbol}${g.current.toLocaleString()} / ${currency.symbol}${g.target.toLocaleString()} (${pct}%)`;
  }).join('\n');

  return {
    success: true,
    message: `💰 **Savings Goals:**\n\n${summary}`,
    attachments: [{
      type: 'savings_progress',
      data: { savingsGoals, totalSavings }
    }],
  };
}

function queryRecentTransactions(ctx: FinancialContext): ActionResult {
  const { currency, recentTransactions } = ctx;

  if (recentTransactions.length === 0) {
    return {
      success: true,
      message: "You don't have any recent transactions. Start by logging one! 📝",
    };
  }

  const list = recentTransactions.slice(0, 5).map(t => {
    const icon = t.type === 'credit' ? '💰' : t.type === 'savings' ? '🎯' : '📤';
    return `${icon} ${t.description} — ${currency.symbol}${t.amount.toLocaleString()} (${t.date})`;
  }).join('\n');

  return {
    success: true,
    message: `📋 **Recent Transactions:**\n\n${list}`,
    attachments: [{
      type: 'transaction_list',
      data: { transactions: recentTransactions.slice(0, 5) }
    }],
  };
}

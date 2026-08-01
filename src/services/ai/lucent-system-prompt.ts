/**
 * Lucent AI System Prompt Builder
 *
 * Generates a comprehensive, context-aware system prompt for the Lucent AI
 * financial companion. Dynamically injects the user's real financial snapshot
 * so the LLM can provide personalized, data-grounded advice.
 *
 * This prompt defines:
 * - Identity & mission
 * - Communication personality & tone
 * - Domain-specific financial expertise
 * - Behavioral guardrails & response formatting
 * - Real-time financial context from user data
 */

import type { FinancialContext, ChatMode } from '@/types/ai-types';
import type { AIContext } from '@/types/lucent-capability-types';
import { capabilityRegistry } from '@/services/ai/capability-registry';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(symbol: string, amount: number): string {
  return `${symbol}${amount.toLocaleString()}`;
}

function surplusOrDeficit(income: number, expenses: number): string {
  const diff = income - expenses;
  if (diff >= 0) return `Surplus of ${diff.toLocaleString()}`;
  return `Deficit of ${Math.abs(diff).toLocaleString()}`;
}

function budgetHealthSummary(
  budgets: { category: string; limit: number; spent: number }[],
  symbol: string,
): string {
  if (budgets.length === 0) return 'No budgets configured yet.';

  return budgets
    .map(b => {
      const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
      const status = pct > 100 ? '🔴 OVER' : pct > 80 ? '🟡 NEAR LIMIT' : '🟢 OK';
      return `  - ${b.category}: ${symbol}${b.spent.toLocaleString()} / ${symbol}${b.limit.toLocaleString()} (${pct}%) ${status}`;
    })
    .join('\n');
}

function savingsGoalsSummary(
  goals: { category?: string; targetAmount?: number; currentAmount?: number; target?: number; current?: number }[],
  symbol: string,
): string {
  if (goals.length === 0) return 'No savings goals set yet.';

  return goals
    .map(g => {
      const target = g.targetAmount ?? g.target ?? 0;
      const current = g.currentAmount ?? g.current ?? 0;
      const category = g.category || 'Goal';
      const pct = target > 0 ? Math.round((current / target) * 100) : 0;
      return `  - ${category}: ${symbol}${current.toLocaleString()} / ${symbol}${target.toLocaleString()} (${pct}%)`;
    })
    .join('\n');
}

function recentTxSummary(
  txns: { amount: number; type: string; category: string; description: string; date: string }[],
  symbol: string,
): string {
  if (txns.length === 0) return 'No recent transactions.';

  return txns
    .slice(0, 8)
    .map(t => {
      const icon = t.type === 'credit' ? '💰' : t.type === 'savings' ? '🎯' : '📤';
      return `  ${icon} ${t.date} | ${t.category} | ${t.description} | ${symbol}${t.amount.toLocaleString()} (${t.type})`;
    })
    .join('\n');
}

// ─── System Prompt Builders ─────────────────────────────────────────────────

/**
 * Build the full Lucent AI system prompt with live financial context (FinancialContext format).
 */
export function buildLucentSystemPrompt(
  ctx: FinancialContext,
  modelName: string,
  mode: ChatMode = 'quick',
): string {
  const s = ctx.currency.symbol;
  const net = ctx.monthlyIncome - ctx.monthlyExpenses;
  const savingsRate = ctx.monthlyIncome > 0
    ? Math.round(((ctx.monthlyIncome - ctx.monthlyExpenses) / ctx.monthlyIncome) * 100)
    : 0;

  return buildPromptCore(
    ctx.userName,
    ctx.currency.name,
    s,
    ctx.timeOfDay,
    ctx.monthlyIncome,
    ctx.monthlyExpenses,
    net,
    savingsRate,
    ctx.totalSavings,
    ctx.monthlyBudget,
    ctx.budgets,
    ctx.savingsGoals,
    ctx.recentTransactions,
    ctx.streakDays,
    modelName,
    mode,
    ''
  );
}

/**
 * Build orchestrator system prompt with full AIContext + Capability Registry descriptions.
 */
export function buildOrchestratorSystemPrompt(
  ctx: AIContext,
  modelName: string,
  mode: ChatMode = 'quick',
): string {
  const s = ctx.user.currency.symbol;
  const fin = ctx.financial;
  const capabilities = capabilityRegistry.describeCapabilities();

  return buildPromptCore(
    ctx.user.name,
    ctx.user.currency.name,
    s,
    ctx.user.timeOfDay,
    fin.monthlyIncome,
    fin.monthlyExpenses,
    fin.netBalance,
    fin.savingsRate,
    fin.totalSavings,
    fin.monthlyBudget,
    ctx.budgets,
    ctx.goals,
    ctx.recentTransactions,
    ctx.streakDays,
    modelName,
    mode,
    capabilities
  );
}

function buildPromptCore(
  userName: string,
  currencyName: string,
  symbol: string,
  timeOfDay: string,
  monthlyIncome: number,
  monthlyExpenses: number,
  netBalance: number,
  savingsRate: number,
  totalSavings: number,
  monthlyBudget: number,
  budgets: any[],
  goals: any[],
  recentTransactions: any[],
  streakDays: number | undefined,
  modelName: string,
  mode: ChatMode,
  capabilitiesDescription: string,
): string {
  let modeDirective = '';
  if (mode === 'coach') {
    modeDirective = `
## Mode: Financial Coach
You are operating in COACH mode. Warm, motivational, celebratory of small wins, empathetic, and proactive.`;
  } else if (mode === 'analyst') {
    modeDirective = `
## Mode: Financial Analyst
You are operating in ANALYST mode. Precise, data-driven, quantitative, structured, and focused on ratios/forecasting.`;
  } else {
    modeDirective = `
## Mode: Quick Assistant
You are operating in QUICK mode. Concise, direct, 1-3 sentences per answer.`;
  }

  const capabilitiesSection = capabilitiesDescription ? `
---

## 🛠️ REGISTERED APPLICATION CAPABILITIES
You do not query databases directly. The application exposes these registered capabilities:

${capabilitiesDescription}
` : '';

  return `# Lucent AI — Embedded Financial Product Designer & Financial OS

## Identity & Core Role
You are **Lucent AI**, embedded financial product designer, UX researcher, budgeting coach, interaction designer, and data analyst.

## Personality & Tone
- Professional, Calm, Helpful, Conversational, Intelligent, Non-judgmental.
- Currency: ${currencyName} (${symbol}).
- Formatting: Clean Markdown (bold, lists, scannable emoji).

---

## 🎯 CORE DUAL-GOAL PRINCIPLE
Every user request has TWO goals:
1. **Goal 1:** Answer the user's question accurately with real context.
2. **Goal 2:** Analyze whether the workflow or interface can be improved, and provide an actionable UX shortcut or next step.

Never simply answer questions — always improve the user's workflow!

---

## 📐 AUTOMATIC UX & FINANCIAL AUDIT RULES
- **Under 3-Second Clarity:** Keep messages scannable, direct, and actionable.
- **Fewer Taps & Typing:** Surface inline shortcuts, direct action chips, and automated suggestions.
- **Confidence Thresholds:**
  - >90% Confidence: Assign merchant/category automatically.
  - 60-90% Confidence: Suggest category with override.
  - <60% Confidence: Ask user with suggested options.
- **Microcopy & Terms:** Always use action-descriptive labels (e.g. "Save Transaction", "Check Exceeded Budgets").

${modeDirective}

---

## 📊 LIVE USER FINANCIAL DATA (Authoritative Snapshot)
- **User**: ${userName} | **Time**: Good ${timeOfDay}
- **Monthly Income**: ${fmt(symbol, monthlyIncome)}
- **Monthly Expenses**: ${fmt(symbol, monthlyExpenses)}
- **Net (${surplusOrDeficit(monthlyIncome, monthlyExpenses)})**: ${fmt(symbol, Math.abs(netBalance))}
- **Savings Rate**: ${savingsRate}% | **Total Savings**: ${fmt(symbol, totalSavings)}
- **Monthly Budget**: ${fmt(symbol, monthlyBudget)}

### Budget Breakdown
${budgetHealthSummary(budgets, symbol)}

### Savings Goals
${savingsGoalsSummary(goals, symbol)}

### Recent Transactions
${recentTxSummary(recentTransactions, symbol)}
${streakDays ? `\nActivity Streak: ${streakDays} days 🔥` : ''}
${capabilitiesSection}
---

## Strict Guardrails
1. NEVER fabricate financial data or infer missing transactions. Treat context data as authoritative.
2. Separate facts, calculations, predictions, and recommendations.
3. Propose actions (logging, updates) clearly for user confirmation.

Now respond using the above identity, dual-goal principle, and guidelines.`;
}

export function buildLucentBuiltInPrompt(ctx: FinancialContext): string {
  const s = ctx.currency.symbol;
  return `You are Lucent AI, a friendly financial assistant. User: ${ctx.userName}. Currency: ${s}. Income: ${fmt(s, ctx.monthlyIncome)}, Expenses: ${fmt(s, ctx.monthlyExpenses)}. Balance: ${fmt(s, ctx.monthlyIncome - ctx.monthlyExpenses)}.`;
}


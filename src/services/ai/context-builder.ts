/**
 * AI Context Builder
 *
 * Assembles the "briefing document" for the AI before it answers.
 * Pulls data exclusively through the Capability Registry — never
 * from the database. The AI receives structured, verified facts.
 *
 * The Context Builder is the firewall between AI and data.
 */

import type {
  AIContext,
  ExecutionContext,
  MonthlySummary,
  BudgetStatus,
  GoalProgress,
  TransactionSummary,
  ConversationMemory,
  CurrencyInfo,
} from '@/types/lucent-capability-types';
import { capabilityRegistry } from '@/services/ai/capability-registry';
import { knowledgeGraph } from '@/services/financial/knowledge-graph';

class AIContextBuilder {
  private cachedContext: AIContext | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL_MS = 30_000; // 30 seconds

  /**
   * Build a full context snapshot for the AI.
   * Invokes read-only tools through the registry to assemble data.
   */
  async buildContext(
    userId: string,
    currency: CurrencyInfo,
    userName: string,
    conversationMemory: ConversationMemory,
  ): Promise<AIContext> {
    // Return cached context if still fresh
    if (this.cachedContext && Date.now() - this.cacheTimestamp < this.CACHE_TTL_MS) {
      // Update conversation memory (always fresh) and return
      return { ...this.cachedContext, conversation: conversationMemory };
    }

    const execCtx: ExecutionContext = { userId, currency };
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

    // Execute read-only tools in parallel for maximum speed
    const [
      summaryResult,
      budgetsResult,
      goalsResult,
      recentTxResult,
      healthResult,
    ] = await Promise.all([
      this.safeExecute<MonthlySummary>('getMonthlySummary', {}, execCtx),
      this.safeExecute<BudgetStatus[]>('getBudgets', {}, execCtx),
      this.safeExecute<GoalProgress[]>('getGoals', {}, execCtx),
      this.safeExecute<TransactionSummary[]>('getRecentTransactions', { limit: 10 }, execCtx),
      this.safeExecute<{ healthScore: number; grade: string }>('getFinancialHealth', {}, execCtx),
    ]);

    // Rebuild knowledge graph with latest data
    knowledgeGraph.rebuild();

    // Compute insights from relationships
    const relationships = knowledgeGraph.getRelationshipSummaries();

    // Generate quick text insights
    const insights: string[] = [];
    const summary = summaryResult || defaultSummary();
    const budgets = budgetsResult || [];
    const health = healthResult;

    if (summary.savingsRate >= 20) {
      insights.push(`Savings rate of ${summary.savingsRate}% is excellent (above the 20% benchmark).`);
    } else if (summary.savingsRate >= 0) {
      insights.push(`Savings rate is ${summary.savingsRate}%. Target 20% for long-term growth.`);
    } else {
      insights.push(`Spending exceeds income by ${Math.abs(summary.netBalance).toLocaleString()}. Consider reducing discretionary spending.`);
    }

    const overBudgets = budgets.filter(b => b.status === 'over');
    if (overBudgets.length > 0) {
      insights.push(`${overBudgets.length} budget(s) exceeded: ${overBudgets.map(b => b.category).join(', ')}.`);
    }

    if (health?.grade) {
      insights.push(`Financial health grade: ${health.grade} (${health.healthScore}/100).`);
    }

    const context: AIContext = {
      user: { name: userName, currency, timeOfDay: timeOfDay as 'morning' | 'afternoon' | 'evening' },
      financial: summary,
      budgets: budgets,
      goals: goalsResult || [],
      recentTransactions: recentTxResult || [],
      availableTools: capabilityRegistry.getAvailableTools(),
      conversation: conversationMemory,
      relationships,
      insights,
    };

    // Cache it
    this.cachedContext = context;
    this.cacheTimestamp = Date.now();

    return context;
  }

  /**
   * Invalidate the cached context.
   * Called by the event bus when data changes.
   */
  invalidateCache(): void {
    this.cachedContext = null;
    this.cacheTimestamp = 0;
    console.log('[ContextBuilder] Cache invalidated');
  }

  /**
   * Generate the capability description string for the system prompt.
   */
  describeCapabilities(): string {
    return capabilityRegistry.describeCapabilities();
  }

  // ─── Safe Execution ──────────────────────────────────────────────

  private async safeExecute<T>(
    toolName: string,
    params: Record<string, any>,
    ctx: ExecutionContext,
  ): Promise<T | null> {
    if (!capabilityRegistry.hasTool(toolName)) {
      return null;
    }

    try {
      const result = await capabilityRegistry.executeTool(toolName, params, ctx);
      return result.success ? (result.data as T) : null;
    } catch (err) {
      console.warn(`[ContextBuilder] Tool ${toolName} failed:`, err);
      return null;
    }
  }
}

function defaultSummary(): MonthlySummary {
  return {
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    netBalance: 0,
    savingsRate: 0,
    totalSavings: 0,
    monthlyBudget: 0,
  };
}

/** Global singleton */
export const contextBuilder = new AIContextBuilder();

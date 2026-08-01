/**
 * Lucent Knowledge Graph
 *
 * Lightweight in-memory graph that maps financial relationships:
 * Income → Account → Expenses, Savings, Subscriptions, Goals.
 *
 * The AI uses this to answer questions like:
 * "What expenses are preventing me from reaching my vacation goal?"
 * by following edges instead of merely searching rows.
 */

import type {
  GraphNode,
  GraphEdge,
  GraphNodeType,
  GraphEdgeType,
  RelationshipSummary,
} from '@/types/lucent-capability-types';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';

class LucentKnowledgeGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];

  /** Rebuild the graph from current financial data */
  rebuild(): void {
    this.nodes.clear();
    this.edges = [];

    const allTxns = enhancedOfflineManager.getTransactions();
    const budgets = enhancedOfflineManager.getBudgets();
    const savings = enhancedOfflineManager.getSavings();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthTxns = allTxns.filter(t => t.date?.startsWith(currentMonth));

    // 1. Create central "Account" node
    const income = monthTxns.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0);
    const expenses = monthTxns.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0);
    this.addNode('account', 'account', 'Main Account', income - expenses);

    // 2. Income source nodes
    const incomeSources: Record<string, number> = {};
    monthTxns.filter(t => t.type === 'credit').forEach(t => {
      incomeSources[t.category] = (incomeSources[t.category] || 0) + Number(t.amount);
    });

    Object.entries(incomeSources).forEach(([cat, amount]) => {
      const id = `income:${cat}`;
      this.addNode(id, 'income_source', cat, amount);
      this.addEdge(id, 'account', 'funds', amount);
    });

    // 3. Expense category nodes
    const expenseCategories: Record<string, number> = {};
    monthTxns.filter(t => t.type === 'debit').forEach(t => {
      expenseCategories[t.category] = (expenseCategories[t.category] || 0) + Number(t.amount);
    });

    Object.entries(expenseCategories).forEach(([cat, amount]) => {
      const id = `expense:${cat}`;
      this.addNode(id, 'expense_category', cat, amount);
      this.addEdge('account', id, 'spends', amount);
    });

    // 4. Budget nodes (linked to expense categories)
    budgets.forEach((b: any) => {
      const budgetId = `budget:${b.category}`;
      this.addNode(budgetId, 'budget', `${b.category} Budget`, Number(b.monthly_limit || 0));
      this.addEdge(budgetId, `expense:${b.category}`, 'budgets', Number(b.monthly_limit || 0));
    });

    // 5. Savings goal nodes
    savings.forEach((g: any) => {
      const goalId = `goal:${g.id}`;
      this.addNode(goalId, 'savings_goal', g.category || 'Savings Goal', Number(g.current_amount || 0), {
        target: Number(g.target_amount || 0),
      });
      this.addEdge('account', goalId, 'saves', Number(g.current_amount || 0));
    });

    // 6. Blocking relationships: large expense categories that prevent reaching goals
    savings.forEach((g: any) => {
      const target = Number(g.target_amount || 0);
      const current = Number(g.current_amount || 0);
      const deficit = target - current;

      if (deficit > 0) {
        // Find expense categories whose spending exceeds the deficit
        Object.entries(expenseCategories).forEach(([cat, amount]) => {
          if (amount >= deficit * 0.5) {
            this.addEdge(`expense:${cat}`, `goal:${g.id}`, 'blocks', amount, `${cat} spending may be slowing progress toward ${g.category}`);
          }
        });
      }
    });

    console.log(`[KnowledgeGraph] Rebuilt: ${this.nodes.size} nodes, ${this.edges.length} edges`);
  }

  // ─── Graph Operations ──────────────────────────────────────────────

  private addNode(id: string, type: GraphNodeType, label: string, value?: number, metadata?: Record<string, any>): void {
    this.nodes.set(id, { id, type, label, value, metadata });
  }

  private addEdge(from: string, to: string, type: GraphEdgeType, weight?: number, label?: string): void {
    this.edges.push({ from, to, type, weight, label });
  }

  /** Get all nodes of a type */
  getNodesByType(type: GraphNodeType): GraphNode[] {
    return Array.from(this.nodes.values()).filter(n => n.type === type);
  }

  /** Get all edges from a node */
  getOutgoingEdges(nodeId: string): GraphEdge[] {
    return this.edges.filter(e => e.from === nodeId);
  }

  /** Get all edges to a node */
  getIncomingEdges(nodeId: string): GraphEdge[] {
    return this.edges.filter(e => e.to === nodeId);
  }

  /** Find what's blocking a goal */
  getBlockersForGoal(goalId: string): GraphEdge[] {
    return this.edges.filter(e => e.to === goalId && e.type === 'blocks');
  }

  /** Get funding chain: what income sources fund the account */
  getIncomeFunders(): { source: string; amount: number }[] {
    return this.edges
      .filter(e => e.type === 'funds')
      .map(e => ({
        source: this.nodes.get(e.from)?.label || e.from,
        amount: e.weight || 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /** Get spending drain: where money flows out */
  getSpendingDrains(): { category: string; amount: number }[] {
    return this.edges
      .filter(e => e.type === 'spends')
      .map(e => ({
        category: this.nodes.get(e.to)?.label || e.to,
        amount: e.weight || 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  // ─── AI-facing summary ─────────────────────────────────────────────

  /** Generate relationship summaries for the AI context */
  getRelationshipSummaries(): RelationshipSummary[] {
    const summaries: RelationshipSummary[] = [];

    // Income flow summary
    const funders = this.getIncomeFunders();
    if (funders.length > 0) {
      const topSource = funders[0];
      summaries.push({
        description: `Primary income: ${topSource.source} (${topSource.amount.toLocaleString()})`,
      });
    }

    // Top spending drain
    const drains = this.getSpendingDrains();
    if (drains.length > 0) {
      summaries.push({
        description: `Top spending: ${drains[0].category} (${drains[0].amount.toLocaleString()})`,
      });
    }

    // Goal blockers
    const goals = this.getNodesByType('savings_goal');
    goals.forEach(goal => {
      const blockers = this.getBlockersForGoal(goal.id);
      blockers.forEach(blocker => {
        const blockerNode = this.nodes.get(blocker.from);
        summaries.push({
          description: `${blockerNode?.label || 'Spending'} may be blocking ${goal.label}`,
          insight: blocker.label,
        });
      });
    });

    // Budget pressure
    this.edges
      .filter(e => e.type === 'budgets')
      .forEach(e => {
        const budgetNode = this.nodes.get(e.from);
        const expenseNode = this.nodes.get(e.to);
        if (budgetNode && expenseNode && expenseNode.value && budgetNode.value) {
          const utilization = Math.round((expenseNode.value / budgetNode.value) * 100);
          if (utilization > 90) {
            summaries.push({
              description: `${expenseNode.label} budget is at ${utilization}% utilization`,
              insight: `Spent ${expenseNode.value.toLocaleString()} of ${budgetNode.value.toLocaleString()} limit`,
            });
          }
        }
      });

    return summaries;
  }
}

/** Global singleton */
export const knowledgeGraph = new LucentKnowledgeGraph();

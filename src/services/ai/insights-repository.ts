/**
 * Lucent Insights Repository
 * 
 * Generates qualitative and quantitative financial feedback.
 * Operates offline using rule-based heuristics when no local/cloud AI model is present,
 * and seamlessly integrates with AI modules when installed.
 */

import type { FinancialContext } from '@/types/ai-types';

export interface InsightItem {
  id: string;
  type: 'summary' | 'observation' | 'recommendation' | 'prediction';
  title: string;
  description: string;
  metric?: string;
  sentiment: 'positive' | 'caution' | 'neutral';
  category?: string;
  actionPrompt?: string;
}

export class InsightsRepository {
  /** Generate real-time insights from financial context */
  static generateInsights(context: FinancialContext): InsightItem[] {
    const insights: InsightItem[] = [];
    const { monthlyIncome, monthlyExpenses, totalSavings, currency, budgets, recentTransactions } = context;

    const netBalance = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? Math.round((netBalance / monthlyIncome) * 100) : 0;

    // 1. Qualitative Overview Summary
    if (savingsRate >= 20) {
      insights.push({
        id: 'summary-1',
        type: 'summary',
        title: 'Outstanding Savings Rate',
        description: `You're retaining ${savingsRate}% of your income this month. That is well above the recommended 20% benchmark! 🌟`,
        sentiment: 'positive',
        metric: `${savingsRate}% saved`,
      });
    } else if (savingsRate >= 0) {
      insights.push({
        id: 'summary-1',
        type: 'summary',
        title: 'Positive Cash Flow',
        description: `You have a surplus of ${currency.symbol}${netBalance.toLocaleString()} this month. A small boost in savings will push you into top tier! 💪`,
        sentiment: 'neutral',
        metric: `${currency.symbol}${netBalance.toLocaleString()}`,
      });
    } else {
      insights.push({
        id: 'summary-1',
        type: 'summary',
        title: 'Room for Optimization',
        description: `Your spending exceeds income by ${currency.symbol}${Math.abs(netBalance).toLocaleString()} this month. Let's make small adjustments together! 💡`,
        sentiment: 'caution',
        metric: `${currency.symbol}${Math.abs(netBalance).toLocaleString()} deficit`,
      });
    }

    // 2. Budget Observations
    const overBudgets = budgets.filter(b => b.spent > b.limit && b.limit > 0);
    if (overBudgets.length > 0) {
      const highest = overBudgets.sort((a, b) => (b.spent - b.limit) - (a.spent - a.limit))[0];
      insights.push({
        id: 'obs-budget-over',
        type: 'observation',
        title: `${highest.category} Needs Attention`,
        description: `You've spent ${currency.symbol}${highest.spent.toLocaleString()} out of your ${currency.symbol}${highest.limit.toLocaleString()} budget limit.`,
        sentiment: 'caution',
        category: highest.category,
        actionPrompt: `Adjust ${highest.category} budget`,
      });
    } else if (budgets.length > 0) {
      insights.push({
        id: 'obs-budget-healthy',
        type: 'observation',
        title: 'All Budgets On Track',
        description: 'Every single category spending is currently within target limits.',
        sentiment: 'positive',
      });
    }

    // 3. Smart Recommendations
    const rideSharing = recentTransactions.filter(t => t.description.toLowerCase().includes('uber') || t.description.toLowerCase().includes('bolt'));
    if (rideSharing.length >= 3) {
      const totalRide = rideSharing.reduce((sum, t) => sum + t.amount, 0);
      insights.push({
        id: 'rec-rides',
        type: 'recommendation',
        title: 'Ride-Hailing Optimization',
        description: `You spent ${currency.symbol}${totalRide.toLocaleString()} across ${rideSharing.length} trips recently. Cutting 2 trips could save ~${currency.symbol}${Math.round(totalRide * 0.3).toLocaleString()}.`,
        sentiment: 'neutral',
        actionPrompt: 'Set transport budget',
      });
    } else {
      insights.push({
        id: 'rec-generic',
        type: 'recommendation',
        title: 'Automate Savings Rule',
        description: 'Setting up a 10% auto-transfer on payday removes manual friction and accelerates your targets.',
        sentiment: 'positive',
        actionPrompt: 'Create savings goal',
      });
    }

    // 4. Future Prediction
    if (savingsRate > 0) {
      const sixMonthProjection = netBalance * 6;
      insights.push({
        id: 'pred-1',
        type: 'prediction',
        title: '6-Month Projection',
        description: `At your current pace, you will accumulate an extra ${currency.symbol}${sixMonthProjection.toLocaleString()} by the end of 6 months. 🚀`,
        sentiment: 'positive',
        metric: `+${currency.symbol}${sixMonthProjection.toLocaleString()}`,
      });
    }

    return insights;
  }
}

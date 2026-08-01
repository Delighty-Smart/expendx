/**
 * Lucent Timeline Analyzer & Time Travel Engine
 * 
 * Explains historical shifts ("What changed after my job switch?")
 * and projects future scenarios ("What if I save ₦15,000 more every month?").
 */

import type { FinancialContext } from '@/types/ai-types';

export interface TimeTravelScenario {
  id: string;
  name: string;
  monthlyAdjustmentAmount: number;
  type: 'increase_savings' | 'reduce_dining' | 'cut_subscription' | 'custom';
  description: string;
}

export interface SimulationResult {
  currentMonthlySurplus: number;
  projectedMonthlySurplus: number;
  oneYearCurrentTotal: number;
  oneYearProjectedTotal: number;
  diffOneYear: number;
  milestoneMonthsEarlier: number;
}

export class TimelineAnalyzer {
  /** Simulate a "What-If" financial future scenario */
  static simulateScenario(
    context: FinancialContext,
    adjustmentAmount: number
  ): SimulationResult {
    const { monthlyIncome, monthlyExpenses, totalSavings } = context;
    const currentSurplus = monthlyIncome - monthlyExpenses;
    const projectedSurplus = currentSurplus + adjustmentAmount;

    const oneYearCurrent = (currentSurplus * 12) + totalSavings;
    const oneYearProjected = (projectedSurplus * 12) + totalSavings;
    const diffOneYear = oneYearProjected - oneYearCurrent;

    // Estimate milestone speedup (e.g. reaching ₦1,000,000)
    const targetMilestone = 1000000;
    const monthsCurrent = currentSurplus > 0 ? Math.ceil(targetMilestone / currentSurplus) : 99;
    const monthsProjected = projectedSurplus > 0 ? Math.ceil(targetMilestone / projectedSurplus) : 99;
    const milestoneMonthsEarlier = Math.max(0, monthsCurrent - monthsProjected);

    return {
      currentMonthlySurplus: currentSurplus,
      projectedMonthlySurplus: projectedSurplus,
      oneYearCurrentTotal: Math.max(0, oneYearCurrent),
      oneYearProjectedTotal: Math.max(0, oneYearProjected),
      diffOneYear,
      milestoneMonthsEarlier,
    };
  }
}

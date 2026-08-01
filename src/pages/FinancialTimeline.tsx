import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, Sliders, ArrowRight, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useLucentChat } from '@/contexts/ChatContext';

export const FinancialTimeline: React.FC = () => {
  const { sendMessage, financialContext } = useLucentChat();
  const symbol = financialContext.currency.symbol;
  const currentSurplus = Math.max(0, financialContext.monthlyIncome - financialContext.monthlyExpenses);

  const [savingsBoost, setSavingsBoost] = useState<number>(10000);

  // Dynamic scenario calculations based on user's financial snapshot
  const oneYearExtra = savingsBoost * 12;
  const projectedOneYearTotal = (currentSurplus + savingsBoost) * 12 + financialContext.totalSavings;
  const milestoneSpeedupMonths = savingsBoost > 0 ? Math.min(12, Math.max(1, Math.round((oneYearExtra / (currentSurplus + 1)) * 2))) : 0;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-default/40 pb-4">
        <div className="p-2.5 rounded-2xl bg-bg-surface border border-border-default text-text-primary shadow-2xs">
          <Compass className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Financial Time Travel
          </h1>
          <p className="text-xs text-text-secondary">
            Simulate future "what-if" scenarios and forecast wealth milestones.
          </p>
        </div>
      </div>

      {/* Simulator Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-bg-surface border border-border-default/80 space-y-6 shadow-2xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-primary" />
            Future "What-If" Simulator
          </h2>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            +{symbol}{savingsBoost.toLocaleString()} / month
          </span>
        </div>

        {/* Interactive Slider */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between text-xs text-text-secondary font-medium">
            <span>Monthly Savings Boost</span>
            <span className="font-bold text-text-primary">{symbol}{savingsBoost.toLocaleString()}</span>
          </div>
          <Slider
            value={[savingsBoost]}
            min={2000}
            max={100000}
            step={2000}
            onValueChange={([val]) => setSavingsBoost(val)}
          />
        </div>

        {/* Results Comparison Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-4 rounded-xl bg-bg-sidebar-hover/80 border border-border-default/60 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-text-secondary">1-Year Impact</span>
            <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
              +{symbol}{oneYearExtra.toLocaleString()}
            </p>
            <p className="text-[10px] text-text-secondary">Extra wealth in 12 months</p>
          </div>

          <div className="p-4 rounded-xl bg-bg-sidebar-hover/80 border border-border-default/60 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-text-secondary">Milestone Speedup</span>
            <p className="text-base sm:text-lg font-bold text-brand-primary">
              {milestoneSpeedupMonths} Months Earlier
            </p>
            <p className="text-[10px] text-text-secondary">Reach savings goals faster</p>
          </div>

          <div className="p-4 rounded-xl bg-bg-sidebar-hover/80 border border-border-default/60 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-text-secondary">Projected 1-Year Total</span>
            <p className="text-base sm:text-lg font-bold text-text-primary">
              {symbol}{projectedOneYearTotal.toLocaleString()}
            </p>
            <p className="text-[10px] text-text-secondary">Total projected balance</p>
          </div>
        </div>

        {/* Conversational Action Button */}
        <Button
          onClick={() => sendMessage(`What happens if I increase my savings by ${symbol}${savingsBoost.toLocaleString()} every month?`)}
          className="w-full h-10 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold text-xs justify-between px-4 shadow-xs"
        >
          <span>Ask Lucent to build a plan for this scenario</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default FinancialTimeline;

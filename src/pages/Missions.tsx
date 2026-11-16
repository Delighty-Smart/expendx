import React from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLucentChat } from '@/contexts/ChatContext';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { SavingsGoal } from '@/types/transactions';
import { useNavigate } from 'react-router-dom';

export const Missions: React.FC = () => {
  const { sendMessage, financialContext } = useLucentChat();
  const { user } = useAuth();
  const navigate = useNavigate();
  const symbol = financialContext.currency.symbol;

  // Fetch live savings goals from database
  const { data: dbGoals = [], isLoading } = useQuery({
    queryKey: ['savings_goals', user?.id || user?.uid],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [] as SavingsGoal[];
      const userId = user.uid || user.id;
      const snap = await getDocs(query(collection(db, 'savings_goals'), where('user_id', '==', userId)));
      const goals: SavingsGoal[] = [];
      snap.forEach(d => {
        goals.push({ id: d.id, ...d.data() } as SavingsGoal);
      });
      return goals;
    },
  });

  const missions = dbGoals.map(g => {
    const current = g.current_amount || 0;
    const target = g.target_amount || 0;
    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const paceStatus: 'ahead' | 'on_track' | 'behind' = pct >= 75 ? 'ahead' : pct >= 40 ? 'on_track' : 'behind';
    const remainingDays = g.target_date
      ? Math.max(1, Math.ceil((new Date(g.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 30;

    const dailyNeeded = Math.max(100, Math.round((target - current) / remainingDays));

    return {
      id: g.id,
      title: `${g.category} Goal`,
      category: g.category,
      targetAmount: target,
      currentAmount: current,
      deadlineDays: remainingDays,
      paceStatus,
      dailyActionSuggestion: `Save ${symbol}${dailyNeeded.toLocaleString()} daily to reach your goal on time!`,
    };
  });

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-bg-surface border border-border-default text-text-primary shadow-2xs">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
              Financial Missions
            </h1>
            <p className="text-xs text-text-secondary">
              Actionable daily milestones based on your active savings goals.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => navigate('/set-savings-goal')}
          className="h-8 px-3 text-xs bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          New Goal
        </Button>
      </div>

      {/* Missions Grid */}
      {isLoading ? (
        <div className="p-8 rounded-2xl bg-bg-surface border border-border-default text-center text-xs text-text-secondary">
          Loading active missions...
        </div>
      ) : missions.length === 0 ? (
        <div className="p-8 rounded-2xl bg-bg-surface border border-border-default text-center space-y-3">
          <Target className="w-8 h-8 mx-auto text-text-secondary opacity-60" />
          <p className="text-sm font-semibold text-text-primary">No active savings missions</p>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            Create a savings goal to start tracking daily financial missions and pace milestones.
          </p>
          <Button
            size="sm"
            onClick={() => navigate('/set-savings-goal')}
            className="mt-2 h-8 px-4 text-xs bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl"
          >
            Create Savings Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {missions.map((m, idx) => {
            const pct = Math.min(100, Math.round((m.currentAmount / m.targetAmount) * 100));
            const paceColor = m.paceStatus === 'ahead' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
              m.paceStatus === 'on_track' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
              'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';

            const paceText = m.paceStatus === 'ahead' ? 'Ahead of Schedule 🚀' :
              m.paceStatus === 'on_track' ? 'On Track ✅' : 'Needs Nudge ⚡';

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="p-5 rounded-2xl bg-bg-surface border border-border-default/80 space-y-4 shadow-2xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-bg-sidebar-hover text-text-secondary border border-border-default">
                        {m.category}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${paceColor}`}>
                        {paceText}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-text-primary pt-1.5">{m.title}</h3>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-text-primary">
                      {symbol}{m.currentAmount.toLocaleString()} / {symbol}{m.targetAmount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-text-secondary">{m.deadlineDays} days remaining</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-text-primary">
                    <span>Progress</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-border-default/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Daily Micro-Action Chip */}
                <div className="p-3 rounded-xl bg-bg-sidebar-hover/80 border border-border-default/60 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-text-primary font-medium">
                    <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{m.dailyActionSuggestion}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => sendMessage(`I want to add to my ${m.title}`)}
                    className="h-7 text-[11px] px-3 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-xl shrink-0"
                  >
                    Take Action
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Missions;

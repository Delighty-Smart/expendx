import React from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowRight, Sparkles } from 'lucide-react';
import { useLucentChat } from '@/contexts/ChatContext';
import { InsightsRepository, type InsightItem } from '@/services/ai/insights-repository';
import { Button } from '@/components/ui/button';

export const Insights: React.FC = () => {
  const { financialContext, sendMessage } = useLucentChat();
  const insights = InsightsRepository.generateInsights(financialContext);

  const getSentimentStyle = (sentiment: InsightItem['sentiment']) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
      case 'caution':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
      default:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400';
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-default/40 pb-4">
        <div className="p-2.5 rounded-2xl bg-bg-surface border border-border-default text-text-primary shadow-2xs">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            AI Insights Hub
          </h1>
          <p className="text-xs text-text-secondary">
            Qualitative & quantitative feedback generated directly from your financial data.
          </p>
        </div>
      </div>

      {/* Main Insights Grid */}
      {insights.length === 0 ? (
        <div className="p-8 rounded-2xl bg-bg-surface border border-border-default text-center space-y-3">
          <Sparkles className="w-8 h-8 mx-auto text-text-secondary opacity-60" />
          <p className="text-sm font-semibold text-text-primary">No insights available yet</p>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            Log transactions, set budget limits, or create a savings goal to unlock personalized AI feedback.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="p-5 rounded-2xl bg-bg-surface border border-border-default/80 space-y-3 shadow-2xs flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${getSentimentStyle(item.sentiment)}`}>
                    {item.type}
                  </span>
                  {item.metric && (
                    <span className="text-xs font-semibold text-text-primary">
                      {item.metric}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-text-primary pt-1">{item.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{item.description}</p>
              </div>

              {item.actionPrompt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(item.actionPrompt!)}
                  className="mt-3 w-full h-8 text-xs font-medium text-text-primary hover:bg-bg-sidebar-hover rounded-xl justify-between border-border-default/60"
                >
                  <span>Ask Lucent: "{item.actionPrompt}"</span>
                  <ArrowRight className="w-3.5 h-3.5 text-text-secondary" />
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Insights;

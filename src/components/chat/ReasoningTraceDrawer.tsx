import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, CheckCircle2, Cpu } from 'lucide-react';
import type { ReasoningTrace } from '@/types/lucent-capability-types';

interface ReasoningTraceDrawerProps {
  reasoning: ReasoningTrace;
}

export const ReasoningTraceDrawer: React.FC<ReasoningTraceDrawerProps> = ({ reasoning }) => {
  const [isOpen, setIsOpen] = useState(false);

  const formattedTime = (reasoning.executionTimeMs / 1000).toFixed(2);
  const steps = reasoning.thoughtSteps || [
    `Parsed input context for ${reasoning.intent} intent (${Math.round(reasoning.confidence * 100)}% match).`,
    `Evaluated financial snapshot and knowledge graph.`,
    `Generated answer using ${reasoning.modelUsed}.`
  ];

  return (
    <div className="mt-1 select-none">
      {/* Minimal Inline Text Link Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-0.5 sm:gap-1 text-[9.5px] leading-none font-normal text-text-muted/60 hover:text-text-secondary transition-colors cursor-pointer group py-0.5 tracking-tight scale-75 sm:scale-100 origin-left"
      >
        <Sparkles className="w-2.5 h-2.5 text-amber-500/70 group-hover:text-amber-500 shrink-0" />
        <span className="group-hover:underline whitespace-nowrap">Thought process ({formattedTime}s)</span>
        <ChevronDown
          className={`w-2.5 h-2.5 text-text-muted/60 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-amber-500' : ''
          }`}
        />
      </button>

      {/* Minimalist Dropdown Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 p-2.5 rounded-xl bg-bg-surface/80 border border-border-default/40 space-y-2 text-[10px]">
              {/* Step-by-Step Thought Trail */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Reasoning Trail</span>
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-text-secondary leading-snug">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500/80 shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              {/* Tools Used (if any) */}
              {reasoning.toolsUsed.length > 0 && (
                <div className="pt-1.5 border-t border-border-default/30 flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider mr-1">Tools:</span>
                  {reasoning.toolsUsed.map((tool, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-mono"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              )}

              {/* Execution Engine Tag */}
              <div className="pt-1.5 border-t border-border-default/30 flex items-center justify-between text-[9px] text-text-muted">
                <div className="flex items-center gap-1">
                  <Cpu className="w-2.5 h-2.5 text-brand-primary" />
                  <span>Model: <strong className="text-text-primary">{reasoning.modelUsed}</strong></span>
                </div>
                <span className="capitalize px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 font-medium text-[9px]">
                  {reasoning.mode} Mode
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

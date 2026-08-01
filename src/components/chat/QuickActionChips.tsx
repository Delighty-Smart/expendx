import React from 'react';
import { Sparkles, Check, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickActionChipsProps {
  onSelect: (prompt: string) => void;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
}

export const QuickActionChips: React.FC<QuickActionChipsProps> = ({ onSelect, timeOfDay = 'afternoon' }) => {
  const getContextualChips = () => {
    switch (timeOfDay) {
      case 'morning':
        return [
          { label: "What's my balance?", prompt: "What is my current balance and net income?" },
          { label: "Log breakfast", prompt: "I spent ₦2,500 on breakfast" },
          { label: "Check today's budget", prompt: "How am I doing on my budgets this month?" },
        ];
      case 'evening':
        return [
          { label: "How did I do today?", prompt: "How am I doing financially this month?" },
          { label: "Log transport", prompt: "I spent ₦3,500 on transport today" },
          { label: "Check savings", prompt: "Show my savings goals and progress" },
        ];
      default:
        return [
          { label: "Log an expense", prompt: "I spent ₦" },
          { label: "Check balance", prompt: "What is my current balance?" },
          { label: "Monthly spending", prompt: "How much did I spend this month?" },
          { label: "Budget status", prompt: "Show my budget status" },
        ];
    }
  };

  const chips = getContextualChips();

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1 max-w-full">
      {chips.map((chip, idx) => (
        <motion.button
          key={chip.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          onClick={() => onSelect(chip.prompt)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-bg-surface hover:bg-bg-sidebar-hover text-text-primary border border-border-default transition-all shrink-0 active:scale-95 shadow-2xs"
        >
          <Sparkles className="w-3 h-3 text-text-secondary" />
          <span>{chip.label}</span>
        </motion.button>
      ))}
    </div>
  );
};

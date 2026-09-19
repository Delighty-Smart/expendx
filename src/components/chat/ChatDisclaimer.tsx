import React from 'react';
import { Info, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { ChatMode } from '@/types/ai-types';

interface ChatDisclaimerProps {
  mode: ChatMode;
}

export const ChatDisclaimer: React.FC<ChatDisclaimerProps> = ({ mode }) => {
  const navigate = useNavigate();
  const isQuickMode = mode === 'quick';

  return (
    <motion.div
      key={mode}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-center justify-center gap-1.5 px-3 py-1"
    >
      {isQuickMode ? (
        <>
          <p className="text-[10px] text-text-muted leading-tight text-center">
            Lucent Fast is not AI‑powered. It understands specific commands and performs supported actions instantly.
          </p>
          <button
            type="button"
            onClick={() => navigate('/lucent-guide')}
            className="shrink-0 p-0.5 rounded-full text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-colors"
            title="How to use Lucent Fast"
            aria-label="Learn how to use Lucent Fast"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <>
          <AlertTriangle className="w-3 h-3 text-amber-500/70 shrink-0" />
          <p className="text-[10px] text-text-muted leading-tight text-center">
            AI can occasionally make mistakes. Please review the information before confirming any action.
          </p>
        </>
      )}
    </motion.div>
  );
};

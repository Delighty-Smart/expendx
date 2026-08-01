import React from 'react';
import { motion } from 'framer-motion';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 bg-bg-surface/80 dark:bg-zinc-900/90 border border-border-default/50 rounded-2xl rounded-tl-sm w-fit shadow-xs">
      <span className="text-xs text-text-secondary font-medium mr-1">Lucent is thinking</span>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-brand-primary"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
};

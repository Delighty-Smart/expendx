import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, User } from 'lucide-react';
import type { ChatMessage } from '@/types/ai-types';
import { InlineCard } from './InlineCard';
import { FormattedMarkdownText } from './FormattedMarkdownText';
import { ReasoningTraceDrawer } from './ReasoningTraceDrawer';

interface ChatBubbleProps {
  message: ChatMessage;
  onActionClick?: (action: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onActionClick }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex gap-2.5 my-3 ${isUser ? 'justify-end' : 'justify-start'} w-full max-w-full overflow-hidden`}
    >
      {!isUser && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs mt-0.5 overflow-hidden border border-border-default/50 bg-bg-surface p-0.5">
          <img
            src="/lucent-avatar-light.png?v=3"
            alt="AI Avatar"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      <div className={`max-w-[92%] sm:max-w-[80%] space-y-2 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words overflow-hidden ${
            isUser
              ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-xs shadow-xs font-medium'
              : 'bg-bg-surface text-text-primary border border-border-default/60 rounded-tl-xs shadow-2xs'
          }`}
        >
          <FormattedMarkdownText content={message.content} />

          {/* Render inline cards if attachments exist */}
          {message.attachments?.map((att, i) => (
            <InlineCard key={i} attachment={att} />
          ))}

          {/* Render suggested action chips if provided */}
          {!isUser && message.suggestedActions && message.suggestedActions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {message.suggestedActions.map((act: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onActionClick?.(act)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted/60 hover:bg-brand-primary/10 hover:text-brand-primary border border-border-subtle transition-all active:scale-95"
                >
                  {act}
                </button>
              ))}
            </div>
          )}

          {/* Render reasoning trace drawer if present */}
          {!isUser && message.reasoning && (
            <ReasoningTraceDrawer reasoning={message.reasoning} />
          )}
        </div>
      </div>
    </motion.div>
  );
};

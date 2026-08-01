import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, TrendingUp, Wallet, Landmark, Receipt } from 'lucide-react';
import type { ChatAttachment } from '@/types/ai-types';

import { TransactionReviewCard } from './TransactionReviewCard';
import type { TransactionDraft } from '@/types/transaction-draft';

interface InlineCardProps {
  attachment: ChatAttachment;
  onConfirmDraft?: (draft: TransactionDraft) => void;
}

export const InlineCard: React.FC<InlineCardProps> = ({ attachment, onConfirmDraft }) => {
  const { type, data } = attachment;

  if (type === 'image_preview' && data.imageUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="my-2 overflow-hidden rounded-2xl border border-border-default bg-black/10 max-w-xs"
      >
        <img
          src={data.imageUrl}
          alt={data.filename || 'Uploaded receipt preview'}
          className="w-full h-48 object-cover rounded-2xl"
        />
      </motion.div>
    );
  }

  if (type === ( 'transaction_draft' as any ) && data.draft) {
    return (
      <TransactionReviewCard
        draft={data.draft as TransactionDraft}
        onConfirm={(draft) => onConfirmDraft?.(draft)}
      />
    );
  }

  if (type === 'transaction_created') {
    const isIncome = data.type === 'credit';
    const isSavings = data.type === 'savings';

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="my-2 p-3.5 rounded-2xl bg-bg-surface border border-border-default shadow-xs flex items-center justify-between gap-3 max-w-sm"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            isIncome ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
            isSavings ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
            'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}>
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-text-primary">{data.category}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">Logged</span>
            </div>
            <p className="text-xs text-text-secondary truncate max-w-[160px]">{data.description}</p>
          </div>
        </div>

        <div className="text-right">
          <p className={`text-sm font-extrabold ${
            isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-primary'
          }`}>
            {isIncome ? '+' : '-'}{data.currency?.symbol || '₦'}{Number(data.amount).toLocaleString()}
          </p>
          <p className="text-[10px] text-text-secondary">{data.date}</p>
        </div>
      </motion.div>
    );
  }

  if (type === 'budget_summary' && data.budgets) {
    return (
      <div className="my-2 p-3.5 rounded-2xl bg-bg-surface border border-border-default space-y-2 max-w-sm shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-brand-primary" />
            Budget Overview
          </span>
          <span className="text-[10px] text-text-secondary">{data.budgets.length} categories</span>
        </div>
        <div className="space-y-2 pt-1">
          {data.budgets.slice(0, 3).map((b: any, idx: number) => {
            const pct = b.limit > 0 ? Math.min(100, Math.round((b.spent / b.limit) * 100)) : 0;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-medium text-text-primary">{b.category}</span>
                  <span className="text-text-secondary">{pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-border-default rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (type === 'quick_actions' && data.actions) {
    return (
      <div className="my-2.5 p-3.5 rounded-2xl bg-bg-surface border border-border-default space-y-2.5 max-w-sm shadow-xs">
        <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
          <ArrowRight className="w-4 h-4 text-brand-primary" />
          {data.title || 'Quick Actions'}
        </span>
        <div className="flex flex-col gap-1.5">
          {data.actions.map((act: any, idx: number) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (onConfirmDraft && typeof (window as any).__sendLucentMessage === 'function') {
                  (window as any).__sendLucentMessage(act.query);
                } else {
                  const event = new CustomEvent('lucent:send_message', { detail: { message: act.query } });
                  window.dispatchEvent(event);
                }
              }}
              className="w-full text-left text-xs font-semibold px-3 py-2 rounded-xl bg-muted/50 hover:bg-brand-primary/10 hover:text-brand-primary border border-border-subtle transition-all active:scale-[0.98] flex items-center justify-between"
            >
              <span>{act.label}</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-70" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

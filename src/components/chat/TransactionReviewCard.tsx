import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Edit2, Sparkles, Store, HelpCircle, CheckCircle2, AlertCircle, Calendar, Tag, DollarSign, ChevronDown } from 'lucide-react';
import type { TransactionDraft } from '@/types/transaction-draft';
import { expenseCategories, getDefaultCategoriesForType } from '@/types/transactions';
import { merchantLearning } from '@/services/ai/merchant-learning';

interface TransactionReviewCardProps {
  draft: TransactionDraft;
  onConfirm: (confirmedDraft: TransactionDraft) => void;
  onEdit?: (draft: TransactionDraft) => void;
  onCancel?: () => void;
}

export const TransactionReviewCard: React.FC<TransactionReviewCardProps> = ({
  draft: initialDraft,
  onConfirm,
  onCancel,
}) => {
  const [draft, setDraft] = useState<TransactionDraft>(initialDraft);
  const [isSaved, setIsSaved] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [editingField, setEditingField] = useState<'amount' | 'category' | 'merchant' | 'date' | 'notes' | null>(null);

  const [tempAmount, setTempAmount] = useState(String(draft.amount));
  const [tempMerchant, setTempMerchant] = useState(draft.merchant || '');
  const [tempNotes, setTempNotes] = useState(draft.notes);

  const availableCategories = getDefaultCategoriesForType(draft.type as any) || expenseCategories;

  const handleConfirm = () => {
    setIsSaved(true);
    if (draft.merchant && draft.category.name) {
      merchantLearning.learnMapping(draft.merchant, draft.category.name);
    }
    onConfirm(draft);
  };

  const handleSaveAmount = () => {
    const val = parseFloat(tempAmount.replace(/,/g, ''));
    if (!isNaN(val) && val > 0) {
      setDraft(prev => ({ ...prev, amount: val }));
    }
    setEditingField(null);
  };

  const handleSelectCategory = (cat: string) => {
    setDraft(prev => ({
      ...prev,
      category: {
        ...prev.category,
        name: cat,
        confidence: 1.0,
        status: 'confirmed',
        reason: 'User override selection',
        source: 'user_override',
      },
    }));
    setEditingField(null);
  };

  const handleSaveMerchant = () => {
    const trimmed = tempMerchant.trim();
    if (trimmed) {
      const match = merchantLearning.getCategoryForMerchant(trimmed);
      setDraft(prev => ({
        ...prev,
        merchant: trimmed,
        category: match ? {
          name: match.category,
          confidence: match.confidence,
          status: 'suggested',
          reason: `Matched merchant '${trimmed}' from learning memory`,
          source: 'merchant_memory',
        } : prev.category
      }));
    }
    setEditingField(null);
  };

  const handleSaveNotes = () => {
    setDraft(prev => ({ ...prev, notes: tempNotes }));
    setEditingField(null);
  };

  const confidencePct = Math.round((draft.category.confidence || 0.85) * 100);
  const isNeedsCat = draft.category.status === 'unknown' || draft.category.confidence < 0.60;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="my-2 p-3 rounded-2xl bg-bg-surface border border-border-default/60 shadow-xs max-w-sm space-y-2.5"
    >
      {/* Header Status */}
      <div className="flex items-center justify-between pb-2 border-b border-border-default/30">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-text-primary">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{isSaved ? 'Transaction Saved' : 'Transaction Draft'}</span>
        </div>
        {isSaved ? (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-2.5 h-2.5" /> Saved
          </span>
        ) : (
          <span className="text-[9px] font-medium text-amber-500 px-1.5 py-0.2 rounded-md bg-amber-500/10 font-semibold">
            Draft
          </span>
        )}
      </div>

      {/* Amount Display */}
      <div className="flex items-baseline justify-between">
        <div className="w-full">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Amount</span>
            {!isSaved && editingField !== 'amount' && (
              <button
                type="button"
                onClick={() => setEditingField('amount')}
                className="text-[9px] text-brand-primary hover:underline font-semibold"
              >
                Edit
              </button>
            )}
          </div>

          {editingField === 'amount' ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-base font-bold">{draft.currency}</span>
              <input
                type="number"
                value={tempAmount}
                onChange={e => setTempAmount(e.target.value)}
                className="w-24 px-1.5 py-0.5 text-xs font-bold rounded border border-brand-primary bg-bg-surface text-text-primary focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveAmount}
                className="px-2 py-0.5 text-[10px] bg-emerald-600 text-white font-semibold rounded"
              >
                Save
              </button>
            </div>
          ) : (
            <span className={`text-lg font-bold ${draft.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-primary'}`}>
              {draft.type === 'credit' ? '+' : '-'}{draft.currency}{Number(draft.amount).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Fields Grid */}
      <div className="grid grid-cols-2 gap-2 pt-0.5 text-xs">
        {/* Category Field */}
        <div className="col-span-2 p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-border-default/30 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" /> Category
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowExplain(!showExplain)}
                className="text-[9px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
              >
                <HelpCircle className="w-2.5 h-2.5" /> {confidencePct}% match
              </button>
              {!isSaved && (
                <button
                  type="button"
                  onClick={() => setEditingField(editingField === 'category' ? null : 'category')}
                  className="text-[9px] text-brand-primary hover:underline font-semibold flex items-center gap-0.5"
                >
                  Change <ChevronDown className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-primary flex items-center gap-1">
              {isNeedsCat ? (
                <span className="text-amber-500 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3" /> Needs Categorization
                </span>
              ) : (
                draft.category.name
              )}
            </span>
          </div>

          {/* Interactive Category Dropdown Picker */}
          {editingField === 'category' && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1.5 p-1 rounded-lg bg-bg-surface border border-border-default shadow-lg space-y-0.5 max-h-36 overflow-y-auto"
            >
              {availableCategories.map((cat, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className={`w-full text-left px-2 py-1 rounded text-[11px] hover:bg-black/5 dark:hover:bg-white/5 transition-all ${
                    cat === draft.category.name ? 'font-bold text-brand-primary bg-brand-primary/10' : 'text-text-primary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </motion.div>
          )}

          {/* Category Explanation Box */}
          {showExplain && (
            <div className="mt-1.5 p-1.5 rounded bg-bg-surface text-[9px] text-text-secondary border border-border-default/40 space-y-0.5">
              <p>• Source: <strong>{draft.category.source || 'Concept Analysis'}</strong></p>
              {draft.category.reason && <p>• Rationale: {draft.category.reason}</p>}
            </div>
          )}
        </div>

        {/* Merchant */}
        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-border-default/30 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider flex items-center gap-1">
              <Store className="w-2.5 h-2.5" /> Merchant
            </span>
            {!isSaved && (
              <button
                type="button"
                onClick={() => setEditingField(editingField === 'merchant' ? null : 'merchant')}
                className="text-[9px] text-brand-primary hover:underline font-semibold"
              >
                {draft.merchant ? 'Edit' : '+ Add'}
              </button>
            )}
          </div>

          {editingField === 'merchant' ? (
            <div className="space-y-1 mt-0.5">
              <input
                type="text"
                value={tempMerchant}
                onChange={e => setTempMerchant(e.target.value)}
                placeholder="e.g. Shell, Jumia..."
                className="w-full px-1.5 py-0.5 text-[11px] rounded border border-brand-primary bg-bg-surface text-text-primary focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveMerchant}
                className="w-full py-0.5 text-[9px] bg-emerald-600 text-white font-semibold rounded"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 pt-0.5">
              {draft.merchant ? (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(draft.merchant.toLowerCase().replace(/\s+/g, '') + '.com')}&sz=64`}
                  alt={draft.merchant}
                  className="w-3.5 h-3.5 rounded-full object-cover shrink-0 bg-white/20"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : null}
              <span className="text-xs font-medium text-text-primary truncate block">
                {draft.merchant || <span className="text-amber-500 font-semibold">Unknown</span>}
              </span>
            </div>
          )}
        </div>

        {/* Date */}
        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-border-default/30 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> Date
            </span>
            {!isSaved && (
              <button
                type="button"
                onClick={() => setEditingField(editingField === 'date' ? null : 'date')}
                className="text-[9px] text-brand-primary hover:underline font-semibold"
              >
                Edit
              </button>
            )}
          </div>

          {editingField === 'date' ? (
            <input
              type="date"
              value={draft.date}
              onChange={e => {
                if (e.target.value) {
                  setDraft(prev => ({ ...prev, date: e.target.value }));
                  setEditingField(null);
                }
              }}
              className="w-full px-1 py-0.5 text-[11px] rounded border border-brand-primary bg-bg-surface text-text-primary focus:outline-none"
              autoFocus
            />
          ) : (
            <span className="text-xs font-medium text-text-primary block">{draft.date}</span>
          )}
        </div>

        {/* Notes (Original Preserved Natural Input) */}
        <div className="col-span-2 p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-border-default/30 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Original Context / Notes</span>
            {!isSaved && (
              <button
                type="button"
                onClick={() => setEditingField(editingField === 'notes' ? null : 'notes')}
                className="text-[9px] text-brand-primary hover:underline font-semibold"
              >
                Edit
              </button>
            )}
          </div>

          {editingField === 'notes' ? (
            <div className="space-y-1 mt-0.5">
              <textarea
                value={tempNotes}
                onChange={e => setTempNotes(e.target.value)}
                rows={2}
                className="w-full p-1 text-[11px] rounded border border-brand-primary bg-bg-surface text-text-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-2 py-0.5 text-[9px] bg-emerald-600 text-white font-semibold rounded"
              >
                Save
              </button>
            </div>
          ) : (
            <p className="text-text-secondary text-[10px] leading-snug line-clamp-2">{draft.notes}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {isCancelled && (
        <div className="pt-1 flex items-center justify-center gap-1 text-text-muted text-[10px] font-medium">
          <span>Cancelled — no changes were made.</span>
        </div>
      )}
      {!isSaved && !isCancelled && (
        <div className="pt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsCancelled(true);
              onCancel?.();
            }}
            className="flex-1 py-2 rounded-xl bg-bg-sidebar-hover hover:bg-bg-sidebar-active text-text-secondary font-semibold text-xs transition-all flex items-center justify-center gap-1 active:scale-98"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-[2] py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1 shadow-2xs active:scale-98"
          >
            <Check className="w-3.5 h-3.5" /> Confirm & Save
          </button>
        </div>
      )}
    </motion.div>
  );
};


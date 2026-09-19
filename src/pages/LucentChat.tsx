import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Menu, Edit3, Sparkles, Send, PieChart, MessageSquarePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLucentChat } from '@/contexts/ChatContext';
import { ChatModeSelector } from '@/components/chat/ChatModeSelector';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { QuickActionChips } from '@/components/chat/QuickActionChips';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatDisclaimer } from '@/components/chat/ChatDisclaimer';
import { TransactionForm } from '@/components/TransactionForm';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/contexts/SettingsContext';
import { capabilityRegistry } from '@/services/ai/capability-registry';
import { merchantLearning } from '@/services/ai/merchant-learning';
import type { TransactionDraft } from '@/types/transaction-draft';
import { useQueryClient } from '@tanstack/react-query';

export const LucentChat: React.FC = () => {
  const {
    messages,
    mode,
    setMode,
    isLoading,
    activeModelName,
    sendMessage,
    clearChat,
    financialContext,
  } = useLucentChat();

  const { profile, user } = useAuth();
  const { currency } = useSettings();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userName = profile?.first_name || profile?.username || 'Peter';

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const handleCustomSend = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string }>;
      if (customEvent.detail?.message) {
        sendMessage(customEvent.detail.message);
      }
    };
    window.addEventListener('lucent:send_message', handleCustomSend);
    return () => window.removeEventListener('lucent:send_message', handleCustomSend);
  }, [sendMessage]);

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // ─── Draft Confirmation / Cancellation Handlers ───────────────────────
  const handleConfirmDraft = useCallback(async (draft: TransactionDraft) => {
    const userId = user?.id || 'guest';
    const currencyInfo = {
      code: currency?.code || 'NGN',
      symbol: currency?.symbol || '₦',
      name: currency?.name || 'Nigerian Naira',
    };

    try {
      // Check if this is a savings deposit into a goal
      if (draft.intent === 'ADD_SAVINGS' && draft.merchant) {
        const goalResult = await capabilityRegistry.executeTool('addToGoal', {
          goalName: draft.merchant,
          amount: draft.amount,
        }, {
          userId,
          currency: currencyInfo,
          invalidateQueries: (keys: string[]) => queryClient.invalidateQueries({ queryKey: keys }),
        });

        if (goalResult.success) {
          // Merchant learning reinforcement
          if (draft.merchant && draft.category.name !== 'General') {
            merchantLearning.learnMapping(draft.merchant, draft.category.name);
          }
          return;
        }
      }

      // Standard transaction save via capability registry
      const result = await capabilityRegistry.executeTool('addTransaction', {
        amount: draft.amount,
        type: draft.type,
        category: draft.category.name,
        description: draft.notes,
        date: draft.date,
      }, {
        userId,
        currency: currencyInfo,
        invalidateQueries: (keys: string[]) => queryClient.invalidateQueries({ queryKey: keys }),
      });

      if (result.success) {
        // Reinforce merchant memory on successful save
        if (draft.merchant && draft.category.name !== 'General') {
          merchantLearning.learnMapping(draft.merchant, draft.category.name);
        }
        console.log('[LucentChat] ✅ Transaction saved via draft confirmation:', draft.id);
      } else {
        console.error('[LucentChat] ❌ Failed to save transaction:', result.error);
      }
    } catch (err) {
      console.error('[LucentChat] ❌ Error saving confirmed draft:', err);
    }
  }, [user?.id, currency, queryClient]);

  const handleCancelDraft = useCallback(() => {
    console.log('[LucentChat] 🚫 Draft cancelled by user.');
  }, []);

  return (
    <div className="flex flex-col h-full w-full relative bg-bg-base transition-colors duration-300 overflow-hidden">
      {/* Drawer Sidebar */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNewChat={clearChat}
      />

      {/* Top Header bar matching minimal Gemini layout */}
      <header className="flex items-center justify-between py-2 sm:py-2.5 px-3 sm:px-6 md:px-8 border-b border-border-default/30 shrink-0 bg-bg-surface/50 backdrop-blur-xs">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Menu button for mobile sidebar */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 rounded-full hover:bg-bg-sidebar-hover text-text-secondary hover:text-text-primary transition-colors lg:hidden shrink-0"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Intelligence Engine Selector */}
          <ChatModeSelector
            currentMode={mode}
            onModeChange={setMode}
            activeModelName={activeModelName}
          />
        </div>

        {/* Right Header Action Icons: Dashboard & New Chat */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full hover:bg-bg-sidebar-hover text-text-secondary hover:text-text-primary transition-colors active:scale-95 shrink-0"
            title="Home"
          >
            <PieChart className="w-5 h-5" />
          </button>
          <button
            onClick={clearChat}
            className="p-2 rounded-full hover:bg-bg-sidebar-hover text-text-secondary hover:text-text-primary transition-colors active:scale-95 shrink-0"
            title="New Chat"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Conversational Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 scrollbar-none flex flex-col">
        <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col">
          {messages.length === 0 ? (
            /* Empty State — Gorgeous Gemini style centered greeting */
            <div className="my-auto flex flex-col items-center justify-center text-center space-y-6 animate-fadeIn py-6">
              {/* Portrait Logo */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <img
                  src={document.documentElement.classList.contains('dark') ? "/lucent-portrait-dark.png" : "/lucent-portrait-light.png"}
                  alt="Lucent"
                  className="h-16 sm:h-20 object-contain"
                />
              </motion.div>

              {/* Greeting Header */}
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="space-y-1 flex flex-col items-center justify-center text-center"
              >
                <h1 className="text-3xl sm:text-4xl font-normal text-text-primary tracking-tight text-center">
                  Let's jump in, {userName}!
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary font-normal text-center">
                  Talk to your money.
                </p>
              </motion.div>

              {/* Quick Action Suggestion Chips */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="pt-2 flex justify-center w-full"
              >
                <QuickActionChips
                  onSelect={(prompt) => sendMessage(prompt)}
                  timeOfDay={financialContext.timeOfDay}
                />
              </motion.div>
            </div>
          ) : (
            /* Message Stream */
            <div className="space-y-4 py-2">
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  onActionClick={sendMessage}
                  onConfirmDraft={handleConfirmDraft}
                  onCancelDraft={handleCancelDraft}
                />
              ))}

              {isLoading && (
                <div className="py-2">
                  <TypingIndicator />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Input Bar Section (Anchored to bottom) */}
      <div className="pt-2 pb-5 sm:pb-6 px-4 sm:px-6 shrink-0 bg-bg-base">
        <div className="max-w-3xl mx-auto space-y-1.5 text-center">
          {messages.length > 0 && (
            <QuickActionChips
              onSelect={(prompt) => sendMessage(prompt)}
              timeOfDay={financialContext.timeOfDay}
            />
          )}
          <ChatInput
            onSend={sendMessage}
            onStop={clearChat}
            disabled={isLoading}
            placeholder="Ask Lucent..."
          />
          <ChatDisclaimer mode={mode} />
        </div>
      </div>
    </div>
  );
};

export default LucentChat;

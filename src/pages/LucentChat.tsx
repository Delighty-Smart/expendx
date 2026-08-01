import React, { useState, useRef, useEffect } from 'react';
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
import { TransactionForm } from '@/components/TransactionForm';
import { useAuth } from '@/hooks/useAuth';

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

  const { profile } = useAuth();
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

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] relative bg-bg-base transition-colors duration-300">
      {/* Drawer Sidebar */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNewChat={clearChat}
      />

      {/* Top Header bar matching minimal Gemini layout */}
      <header className="flex items-center justify-between py-3 px-3 border-b border-border-default/30 shrink-0 bg-bg-surface/50 backdrop-blur-xs">
        <div className="flex items-center gap-2">
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
            title="Dashboard"
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
      <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-4 scrollbar-none">
        {messages.length === 0 ? (
          /* Empty State — Gorgeous Gemini style centered greeting */
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-fadeIn py-12">
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
              className="space-y-1.5"
            >
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                Let's jump in, {userName}
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary max-w-sm">
                Talk to your money in natural language. Log expenses, check budgets, or forecast savings.
              </p>
            </motion.div>

            {/* Quick Action Suggestion Chips */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="pt-4"
            >
              <QuickActionChips
                onSelect={(prompt) => sendMessage(prompt)}
                timeOfDay={financialContext.timeOfDay}
              />
            </motion.div>
          </div>
        ) : (
          /* Message Stream */
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} onActionClick={sendMessage} />
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

      {/* Bottom Sticky Input Bar Section */}
      <div className="pt-2 pb-3 px-1 shrink-0 space-y-2">
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
      </div>
    </div>
  );
};

export default LucentChat;

/**
 * Lucent Chat Context & Provider
 * 
 * Central state management for the chat-first Financial OS.
 * Connects intent engine, action dispatcher, AI providers, and UI.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  ChatMessage,
  ChatMode,
  FinancialContext,
  ConversationState,
  ParsedIntent,
  ActionResult,
} from '@/types/ai-types';
import { parseIntent, getFollowUpQuestion } from '@/services/ai/intent-engine';
import { dispatchAction } from '@/services/ai/action-dispatcher';
import { aiRegistry } from '@/services/ai/ai-provider-registry';
import { MockChatProvider } from '@/services/ai/providers/mock-chat-provider';
import { aiDownloadManager } from '@/services/ai/ai-download-manager';
import { buildLucentSystemPrompt } from '@/services/ai/lucent-system-prompt';
import { processMessage } from '@/services/ai/lucent-orchestrator';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/contexts/SettingsContext';
import { useTransactionData } from '@/hooks/useTransactionData';
import { useEnhancedBudgetData } from '@/hooks/useEnhancedBudgetData';
import { useQueryClient } from '@tanstack/react-query';

export interface SavedConversation {
  id: string;
  title: string;
  timestamp: number;
  messages: ChatMessage[];
  lastMessageSnippet: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  isLoading: boolean;
  activeModelName: string;
  sendMessage: (content: string, imageBase64?: string) => Promise<void>;
  clearChat: () => void;
  financialContext: FinancialContext;
  conversationState: ConversationState;
  conversations: SavedConversation[];
  activeConversationId: string | null;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  undoAction?: (undoId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Register default mock provider on load
const mockProvider = new MockChatProvider();
aiRegistry.register(mockProvider);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { currency } = useSettings();
  const queryClient = useQueryClient();

  const { transactions } = useTransactionData();
  const { budgets: budgetCategories } = useEnhancedBudgetData();

  const [conversations, setConversations] = useState<SavedConversation[]>(() => {
    try {
      const saved = localStorage.getItem('lucent_chat_conversations');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load saved chat conversations', e);
    }
    return [
      {
        id: 'default_1',
        title: 'Monthly budget review & savings plan',
        timestamp: Date.now() - 3600000 * 2,
        messages: [],
        lastMessageSnippet: 'Show me my monthly budget review and savings breakdown',
      },
      {
        id: 'default_2',
        title: 'Emergency fund goal setup',
        timestamp: Date.now() - 3600000 * 24,
        messages: [],
        lastMessageSnippet: 'Help me plan an emergency fund goal',
      },
    ];
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('lucent_active_chat_id');
    } catch (e) {
      return null;
    }
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const cached = sessionStorage.getItem('lucent_chat_messages');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.warn('Failed to parse cached chat messages', e);
    }
    return [];
  });

  // Save conversation list to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lucent_chat_conversations', JSON.stringify(conversations));
    } catch (e) {
      console.warn('Failed to save chat conversations list', e);
    }
  }, [conversations]);

  // Persist messages of current session
  useEffect(() => {
    try {
      sessionStorage.setItem('lucent_chat_messages', JSON.stringify(messages.slice(-50)));
    } catch (e) {
      console.warn('Failed to cache chat messages', e);
    }

    // Auto-update active conversation record in list
    if (messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = firstUserMsg ? (firstUserMsg.content.slice(0, 36) + (firstUserMsg.content.length > 36 ? '...' : '')) : 'New Conversation';
      const lastMsg = messages[messages.length - 1];
      const snippet = lastMsg ? lastMsg.content.slice(0, 60) : '';

      setConversations(prev => {
        const idToUse = activeConversationId || `session_${Date.now()}`;
        if (!activeConversationId) {
          setActiveConversationId(idToUse);
          try { localStorage.setItem('lucent_active_chat_id', idToUse); } catch (e) {}
        }
        const existingIdx = prev.findIndex(c => c.id === idToUse);
        const updatedItem: SavedConversation = {
          id: idToUse,
          title,
          timestamp: Date.now(),
          messages,
          lastMessageSnippet: snippet,
        };

        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = updatedItem;
          return next;
        } else {
          return [updatedItem, ...prev];
        }
      });
    }
  }, [messages, activeConversationId]);

  const loadConversation = useCallback((id: string) => {
    const target = conversations.find(c => c.id === id);
    if (target) {
      setActiveConversationId(id);
      try { localStorage.setItem('lucent_active_chat_id', id); } catch (e) {}
      setMessages(target.messages || []);
    }
  }, [conversations]);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
      try { localStorage.removeItem('lucent_active_chat_id'); } catch (e) {}
    }
  }, [activeConversationId]);

  const [mode, setModeState] = useState<ChatMode>(() => {
    try {
      const stored = localStorage.getItem('lucent_chat_mode');
      if (stored === 'quick' || stored === 'coach' || stored === 'analyst' || stored === 'cloud') {
        return stored as ChatMode;
      }
    } catch (e) {
      console.warn('Failed to read chat mode from localStorage', e);
    }
    return 'quick';
  });

  const setMode = useCallback((newMode: ChatMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem('lucent_chat_mode', newMode);
    } catch (e) {
      console.warn('Failed to store chat mode in localStorage', e);
    }
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<Partial<ParsedIntent> | undefined>();
  const [awaitingFields, setAwaitingFields] = useState<string[]>([]);
  const [lastQuestion, setLastQuestion] = useState<string | undefined>();

  // Persist messages to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem('lucent_chat_messages', JSON.stringify(messages.slice(-50)));
    } catch (e) {
      console.warn('Failed to cache chat messages', e);
    }
  }, [messages]);

  // Compute live financial context snapshot for AI awareness
  const financialContext = useMemo<FinancialContext>(() => {
    const now = new Date();
    const hour = now.getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

    const safeTxns = transactions || [];
    const safeBudgets = budgetCategories || [];

    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    const monthTxns = safeTxns.filter(t => t.date && t.date.startsWith(currentMonth));

    const monthlyIncome = monthTxns
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const monthlyExpenses = monthTxns
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalSavings = monthTxns
      .filter(t => t.type === 'savings')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const budgets = safeBudgets.map(b => {
      const spent = monthTxns
        .filter(t => t.type === 'debit' && t.category === b.category)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return {
        category: b.category,
        limit: Number(b.monthly_limit || 0),
        spent,
      };
    });

    const monthlyBudget = budgets.reduce((sum, b) => sum + b.limit, 0);

    return {
      userName: profile?.first_name || profile?.username || 'Peter',
      currentBalance: monthlyIncome - monthlyExpenses,
      totalSavings,
      monthlyIncome,
      monthlyExpenses,
      monthlyBudget,
      currency: {
        code: currency?.code || 'NGN',
        symbol: currency?.symbol || '₦',
        name: currency?.name || 'Nigerian Naira',
      },
      recentTransactions: safeTxns.slice(0, 10).map(t => ({
        amount: Number(t.amount || 0),
        type: t.type,
        category: t.category,
        description: t.description,
        date: t.date,
      })),
      budgets,
      savingsGoals: [], // Expandable in phase 3
      timeOfDay,
    };
  }, [user, profile, currency, transactions, budgetCategories]);

  const conversationState: ConversationState = useMemo(() => ({
    pendingIntent,
    lastQuestion,
    awaitingFields,
    messageHistory: messages,
    mode,
  }), [pendingIntent, lastQuestion, awaitingFields, messages, mode]);

  const activeModelName = useMemo(() => {
    if (mode === 'cloud') return 'Gemma 4 26B (Cloud)';
    if (mode === 'coach') return 'SmolLM2 360M (Coach)';
    if (mode === 'analyst') return 'Qwen 2.5 1.5B (Analyst)';
    return 'Lucent (Fast)';
  }, [mode]);

  const sendMessage = useCallback(async (content: string, imageBase64?: string) => {
    if (!content.trim() || isLoading) return;

    const userAttachments: any[] = [];
    if (imageBase64) {
      userAttachments.push({
        type: 'image_preview',
        data: { imageUrl: imageBase64 },
      });
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
      attachments: userAttachments.length > 0 ? userAttachments : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await processMessage(
        content.trim(),
        conversationState,
        messages,
        user?.id || 'guest',
        mode,
        financialContext.currency,
        financialContext.userName,
        (keys) => queryClient.invalidateQueries({ queryKey: keys }),
        imageBase64
      );

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        attachments: response.attachments as any,
        suggestedActions: response.suggestedActions,
        reasoning: response.reasoning,
      };

      if (response.pendingIntent && response.awaitingFields?.length) {
        setPendingIntent(response.pendingIntent);
        setAwaitingFields(response.awaitingFields);
        setLastQuestion(response.content);
      } else {
        setPendingIntent(undefined);
        setAwaitingFields([]);
        setLastQuestion(undefined);
      }

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Error handling message via orchestrator:', err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: "I ran into a hiccup processing that. Could you try rephrasing? 💬",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, conversationState, messages, user?.id, mode, financialContext.currency, financialContext.userName, queryClient]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
    setPendingIntent(undefined);
    setAwaitingFields([]);
    setLastQuestion(undefined);
    try {
      sessionStorage.removeItem('lucent_chat_messages');
    } catch (e) {
      console.warn('Failed to clear chat storage', e);
    }
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        mode,
        setMode,
        isLoading,
        activeModelName,
        sendMessage,
        clearChat,
        financialContext,
        conversationState,
        conversations,
        activeConversationId,
        loadConversation,
        deleteConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useLucentChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useLucentChat must be used within a ChatProvider');
  }
  return context;
};

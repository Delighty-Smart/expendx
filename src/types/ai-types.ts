/**
 * Lucent AI Abstraction Layer
 * 
 * Every AI module implements these interfaces.
 * The app works perfectly with MockProviders when no AI is installed.
 * Cloud or local models plug in without changing business logic.
 */

import type { Transaction } from './transactions';
import type { ReasoningTrace } from './lucent-capability-types';

// ─── Chat Message Types ──────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMode = 'quick' | 'coach' | 'analyst' | 'cloud' | 'nvidia';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  /** Structured data attached to assistant messages (tx cards, charts, etc.) */
  attachments?: ChatAttachment[];
  /** If this message triggered a data mutation */
  action?: ExecutedAction;
  /** Whether the message is still being streamed */
  isStreaming?: boolean;
  /** Suggested follow-up actions */
  suggestedActions?: string[];
  /** Reasoning trace showing how Lucent processed this request */
  reasoning?: ReasoningTrace;
}

export type ChatAttachmentType =
  | 'transaction_created'
  | 'transaction_list'
  | 'budget_summary'
  | 'savings_progress'
  | 'spending_chart'
  | 'insight'
  | 'forecast'
  | 'mission_progress'
  | 'quick_actions'
  | 'image_preview';

export interface ChatAttachment {
  type: ChatAttachmentType;
  data: Record<string, any>;
}

// ─── Intent Engine Types ─────────────────────────────────────────────────────

export type IntentType =
  | 'log_expense'
  | 'log_income'
  | 'log_savings'
  | 'query_balance'
  | 'query_spending'
  | 'query_income'
  | 'query_budget'
  | 'query_savings'
  | 'query_transactions'
  | 'create_budget'
  | 'create_goal'
  | 'query_subscriptions'
  | 'query_life_energy'
  | 'query_alerts'
  | 'forecast'
  | 'report'
  | 'greeting'
  | 'help'
  | 'conversation';

export interface ParsedIntent {
  type: IntentType;
  confidence: number;
  entities: IntentEntities;
  rawText: string;
  /** Whether this intent needs follow-up questions before executing */
  needsFollowUp: boolean;
  /** What fields are still missing */
  missingFields?: string[];
}

export interface IntentEntities {
  amount?: number;
  currency?: string;
  category?: string;
  description?: string;
  date?: string;
  merchant?: string;
  transactionType?: 'credit' | 'debit' | 'savings';
  timePeriod?: 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';
  dateFrom?: string;
  dateTo?: string;
  budgetCategory?: string;
  budgetLimit?: number;
  goalName?: string;
  goalAmount?: number;
}

// ─── Action Dispatcher Types ─────────────────────────────────────────────────

export interface ExecutedAction {
  type: IntentType;
  success: boolean;
  data?: Record<string, any>;
  /** Human-readable summary of what was done */
  summary: string;
  /** Allow undo for mutations */
  undoable?: boolean;
  undoId?: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, any>;
  attachments?: ChatAttachment[];
}

// ─── Financial Context ───────────────────────────────────────────────────────

/** Snapshot of user's financial state, passed to AI for context-aware responses */
export interface FinancialContext {
  userName: string;
  currentBalance: number;
  totalSavings: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyBudget: number;
  currency: { code: string; symbol: string; name: string };
  recentTransactions: Pick<Transaction, 'amount' | 'type' | 'category' | 'description' | 'date'>[];
  budgets: { category: string; limit: number; spent: number }[];
  savingsGoals: { category: string; target: number; current: number }[];
  streakDays?: number;
  /** Time of day for contextual greetings */
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

// ─── AI Provider Interfaces ──────────────────────────────────────────────────

/** Base interface for all AI providers */
export interface AIProvider {
  id: string;
  name: string;
  type: AIProviderType;
  status: AIProviderStatus;
  /** Whether this provider works offline (local model vs cloud) */
  isOffline: boolean;
  initialize(): Promise<boolean>;
  dispose(): Promise<void>;
}

export type AIProviderType = 'chat' | 'voice' | 'ocr' | 'analytics' | 'categorization' | 'forecast';
export type AIProviderStatus = 'ready' | 'downloading' | 'initializing' | 'error' | 'not_installed';

/** Chat AI — the core conversational interface */
export interface ChatAIProvider extends AIProvider {
  type: 'chat';
  chat(messages: ChatMessage[], context: FinancialContext): Promise<ChatResponse>;
  streamChat?(messages: ChatMessage[], context: FinancialContext): AsyncGenerator<string, void, unknown>;
}

export interface ChatResponse {
  content: string;
  attachments?: ChatAttachment[];
  /** Suggested follow-up actions */
  suggestedActions?: string[];
  /** Model used for this response */
  model?: string;
}

/** Voice AI — speech-to-text */
export interface VoiceAIProvider extends AIProvider {
  type: 'voice';
  transcribe(audio: Blob): Promise<string>;
  isListening: boolean;
  startListening(): Promise<void>;
  stopListening(): Promise<string>;
}

/** OCR AI — receipt/document scanning */
export interface OCRAIProvider extends AIProvider {
  type: 'ocr';
  scanReceipt(imageBase64: string): Promise<ReceiptData>;
}

export interface ReceiptData {
  amount: number;
  merchant: string;
  date?: string;
  items?: { name: string; quantity: number; amount: number }[];
  category?: string;
  summary: string;
}

// ─── AI Module / Marketplace Types ───────────────────────────────────────────

export interface AIModule {
  id: string;
  name: string;
  description: string;
  type: AIProviderType;
  version: string;
  /** Download size in bytes */
  size: number;
  /** RAM required in MB */
  ramRequired: number;
  status: 'available' | 'downloading' | 'installed' | 'update_available';
  downloadProgress?: number;
  capabilities: string[];
  recommended?: boolean;
  /** 'cloud' = edge function, 'local' = on-device model */
  provider: 'cloud' | 'local';
  /** URL to download model weights from */
  modelUrl?: string;
  /** Model filename for local storage */
  modelFilename?: string;
}

// ─── Conversation Memory ─────────────────────────────────────────────────────

/** Tracks pending multi-turn conversation state */
export interface ConversationState {
  /** Partial intent being built across messages */
  pendingIntent?: Partial<ParsedIntent>;
  /** What question Lucent last asked the user */
  lastQuestion?: string;
  /** Fields we're waiting for the user to provide */
  awaitingFields?: string[];
  /** Previous messages for context window */
  messageHistory: ChatMessage[];
  /** Current chat mode */
  mode: ChatMode;
}

/**
 * Lucent Intelligence Layer — Core Types
 *
 * The type system that powers the entire AI ↔ Application boundary.
 * Every module registers capabilities; the AI discovers and invokes them
 * through structured tools — never through direct database access.
 */

// ─── Tool System ─────────────────────────────────────────────────────────────

/** Describes a parameter a tool accepts */
export interface ToolParam {
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  description: string;
  required: boolean;
  enumValues?: string[];
  defaultValue?: any;
}

/** Metadata describing a callable tool the AI can invoke */
export interface ToolDefinition {
  /** Unique tool name, e.g. "getMonthlyExpenses" */
  name: string;
  /** Human-readable description for AI reasoning */
  description: string;
  /** Module that owns this tool, e.g. "transactions", "budgets" */
  module: string;
  /** Input parameters the tool accepts */
  inputSchema: Record<string, ToolParam>;
  /** Human-readable description of the return shape */
  outputDescription: string;
  /** Whether this tool reads data or modifies it */
  accessLevel: 'read' | 'write';
  /** Must the user confirm before this tool executes? */
  requiresConfirmation: boolean;
  /** Does this tool need an authenticated userId? */
  requiresAuth: boolean;
}

/** The actual handler function behind a tool */
export type ToolHandler = (
  params: Record<string, any>,
  context: ExecutionContext,
) => Promise<ToolResult>;

/** A registered tool = definition + handler */
export interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

/** Execution context passed to every tool handler */
export interface ExecutionContext {
  userId: string;
  currency: CurrencyInfo;
  /** Optional Base64 encoded image string for OCR receipt processing */
  imageBase64?: string;
  /** React Query invalidation callback for write operations */
  invalidateQueries?: (keys: string[]) => void;
}

/** Structured result every tool returns */
export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  /** Which module produced this result */
  source: string;
  timestamp: number;
}

// ─── Module Registration ─────────────────────────────────────────────────────

/** A feature module that registers tools */
export interface ModuleRegistration {
  /** Module identifier, e.g. "transactions" */
  id: string;
  /** Display name, e.g. "Transaction Service" */
  name: string;
  /** Module description */
  description: string;
  /** Tool names this module registers */
  toolNames: string[];
  /** Whether this module depends on an optional AI module */
  requiresAIModule?: string;
  /** Module version */
  version: string;
}

// ─── Currency ────────────────────────────────────────────────────────────────

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

// ─── AI Context (the "briefing document") ────────────────────────────────────

/** Monthly financial summary */
export interface MonthlySummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netBalance: number;
  savingsRate: number;
  totalSavings: number;
  monthlyBudget: number;
}

/** Budget status for a single category */
export interface BudgetStatus {
  category: string;
  limit: number;
  spent: number;
  percentUsed: number;
  remaining: number;
  status: 'ok' | 'warning' | 'over';
}

/** Savings goal progress */
export interface GoalProgress {
  id: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  percentComplete: number;
  monthsToGoal: number | null;
}

/** Lightweight transaction summary for context (no IDs or sensitive fields) */
export interface TransactionSummary {
  amount: number;
  type: 'credit' | 'debit' | 'savings';
  category: string;
  description: string;
  date: string;
}

/** Conversation memory for multi-turn context */
export interface ConversationMemory {
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  pendingAction?: string;
  awaitingFields?: string[];
}

/** The complete context the AI receives before answering */
export interface AIContext {
  user: {
    name: string;
    currency: CurrencyInfo;
    timeOfDay: 'morning' | 'afternoon' | 'evening';
  };
  financial: MonthlySummary;
  budgets: BudgetStatus[];
  goals: GoalProgress[];
  recentTransactions: TransactionSummary[];
  /** Available tools the AI can request */
  availableTools: ToolDefinition[];
  /** Conversation history for multi-turn awareness */
  conversation: ConversationMemory;
  /** Knowledge graph relationships */
  relationships: RelationshipSummary[];
  /** Pre-computed insights */
  insights: string[];
  /** Streak days */
  streakDays?: number;
}

// ─── Knowledge Graph ─────────────────────────────────────────────────────────

/** A node in the financial knowledge graph */
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  /** Computed or stored monetary value */
  value?: number;
  metadata?: Record<string, any>;
}

export type GraphNodeType =
  | 'income_source'    // e.g. "Salary", "Freelance"
  | 'expense_category' // e.g. "Food", "Transport"
  | 'budget'           // Budget limit for a category
  | 'savings_goal'     // e.g. "Vacation Fund"
  | 'subscription'     // e.g. "Netflix"
  | 'account'          // Virtual "balance" node
  | 'milestone';       // e.g. "₦1M savings"

/** A directed edge between two graph nodes */
export interface GraphEdge {
  from: string;        // Node ID
  to: string;          // Node ID
  type: GraphEdgeType;
  weight?: number;     // Monetary flow amount
  label?: string;
}

export type GraphEdgeType =
  | 'funds'            // Income → Account
  | 'spends'           // Account → Expense Category
  | 'saves'            // Account → Savings Goal
  | 'subscribes'       // Account → Subscription
  | 'budgets'          // Budget → Expense Category
  | 'blocks'           // Expense → Goal (prevents reaching)
  | 'depends_on';      // Goal → Income Source

/** Summary of a relationship for AI context */
export interface RelationshipSummary {
  description: string;
  /** e.g. "Dining Out spending (₦78,000) is blocking your Vacation Goal" */
  insight?: string;
}

// ─── Event Bus ───────────────────────────────────────────────────────────────

export type LucentEventType =
  | 'transaction:added'
  | 'transaction:updated'
  | 'transaction:deleted'
  | 'budget:created'
  | 'budget:updated'
  | 'budget:deleted'
  | 'goal:created'
  | 'goal:updated'
  | 'goal:deleted'
  | 'subscription:added'
  | 'subscription:deleted'
  | 'alert:read'
  | 'settings:updated'
  | 'context:refreshed'
  | 'module:installed'
  | 'module:removed';

export interface LucentEvent<T = any> {
  type: LucentEventType;
  data: T;
  timestamp: number;
  source: string;
}

// ─── Reasoning Trace ─────────────────────────────────────────────────────────

export interface ReasoningTrace {
  intent: string;
  confidence: number;
  toolsUsed: string[];
  graphInsights: string[];
  modelUsed: string;
  mode: string;
  executionTimeMs: number;
  /** Specific step-by-step rational thought steps taken to arrive at the answer */
  thoughtSteps?: string[];
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

/** What the orchestrator returns to ChatContext */
export interface OrchestratorResponse {
  /** The assistant's message content */
  content: string;
  /** Structured attachments (transaction cards, charts, etc.) */
  attachments?: Array<{ type: string; data: Record<string, any> }>;
  /** Suggested follow-up actions */
  suggestedActions?: string[];
  /** Whether the orchestrator executed a write action */
  mutated: boolean;
  /** Which tools were invoked */
  toolsUsed: string[];
  /** Internal reasoning trace for UI thought dropdown */
  reasoning?: ReasoningTrace;
  /** Multi-turn conversation state preservation */
  pendingIntent?: any;
  awaitingFields?: string[];
}


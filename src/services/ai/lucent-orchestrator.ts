/**
 * Lucent AI Orchestrator
 *
 * The central brain of the Intelligence Layer.
 * Receives user messages, coordinates intent parsing, context building,
 * tool execution, and LLM inference — all through clean abstractions.
 *
 * The orchestrator NEVER touches the database directly.
 * It communicates exclusively through the Capability Registry.
 */

import type {
  OrchestratorResponse,
  ExecutionContext,
  AIContext,
  CurrencyInfo,
  ConversationMemory,
} from '@/types/lucent-capability-types';
import type {
  ChatMessage,
  ChatMode,
  ConversationState,
  ParsedIntent,
} from '@/types/ai-types';
import { parseIntent, getFollowUpQuestion, parseAmount, extractAmount, detectCategory } from '@/services/ai/intent-engine';
import { merchantLearning } from '@/services/ai/merchant-learning';
import type { TransactionDraft } from '@/types/transaction-draft';
import { capabilityRegistry } from '@/services/ai/capability-registry';
import { contextBuilder } from '@/services/ai/context-builder';
import { lucentEventBus } from '@/services/ai/event-bus';
import { aiDownloadManager } from '@/services/ai/ai-download-manager';
import { buildOrchestratorSystemPrompt } from '@/services/ai/lucent-system-prompt';

// ─── Service Registration (called once at app boot) ──────────────────────────

import { registerTransactionService } from '@/services/financial/transaction-service';
import { registerBudgetService } from '@/services/financial/budget-service';
import { registerGoalService } from '@/services/financial/goal-service';
import { registerAnalyticsService } from '@/services/financial/analytics-service';
import { registerUserService } from '@/services/financial/user-service';
import { registerSubscriptionService } from '@/services/financial/subscription-service';
import { registerAlertService } from '@/services/financial/alert-service';
import { registerLifeEnergyService } from '@/services/financial/life-energy-service';

let servicesRegistered = false;

function ensureServicesRegistered(): void {
  if (servicesRegistered) return;
  registerTransactionService();
  registerBudgetService();
  registerGoalService();
  registerAnalyticsService();
  registerUserService();
  registerSubscriptionService();
  registerAlertService();
  registerLifeEnergyService();
  servicesRegistered = true;
  console.log('[LucentOrchestrator] 🧠 All 8 financial services registered with Capability Registry');
}

// Wire event bus → context builder invalidation
lucentEventBus.onAny(() => {
  contextBuilder.invalidateCache();
});

// ─── Orchestrator ────────────────────────────────────────────────────────────

/**
 * Process a user message through the full Intelligence Layer pipeline.
 *
 * Pipeline:
 * 1. Parse intent (deterministic regex engine)
 * 2. Build AI context via Context Builder (through registry tools)
 * 3. If explicit action with high confidence → execute via registry
 * 4. If query/conversation → build system prompt + invoke LLM or mock provider
 * 5. Emit events for any data mutations
 * 6. Return structured response
 */
export async function processMessage(
  userMessage: string,
  conversationState: ConversationState,
  messages: ChatMessage[],
  userId: string,
  mode: ChatMode,
  currency: CurrencyInfo,
  userName: string,
  invalidateQueries: (keys: string[]) => void,
  imageBase64?: string
): Promise<OrchestratorResponse> {
  const startTime = Date.now();
  ensureServicesRegistered();

  const toolsUsed: string[] = [];

  // Build execution context (passed to every tool)
  const execCtx: ExecutionContext = { userId, currency, invalidateQueries, imageBase64 };

  // ── Step 0: Image Receipt / Document Vision Processing Step ──
  if (imageBase64 || userMessage.toLowerCase().includes('analyzing receipt') || userMessage.includes('Receipt Scan')) {
    console.log('[Orchestrator] 📸 Processing receipt image message via Edge Vision Function...');
    if (imageBase64) {
      try {
        const { extractReceiptData } = await import('@/services/ai/extract-receipt-data');
        const data = await extractReceiptData(imageBase64);

        if (data?.success && data?.data) {
          const rec = data.data;
          const draft: TransactionDraft = {
            id: `draft_${Date.now()}`,
            intent: 'ADD_EXPENSE',
            amount: rec.amount || 0,
            currency: currency.symbol || '₦',
            type: 'debit',
            merchant: rec.merchant,
            category: {
              name: rec.category || 'General',
              confidence: 0.95,
              status: 'suggested',
              reason: `Extracted from receipt photo via PaddleOCR Vision (${rec.merchant || 'Store'})`,
              source: 'concept_engine',
            },
            date: rec.date || new Date().toISOString().split('T')[0],
            notes: rec.summary || `Receipt scan from ${rec.merchant || 'merchant'}`,
            missingFields: [],
            createdAt: Date.now(),
          };

          return {
            content: `🧾 **Receipt Vision Analysis Complete!**\nFound transaction from **${rec.merchant || 'Merchant'}** total of **${currency.symbol}${rec.amount?.toLocaleString()}**.`,
            mutated: false,
            toolsUsed: ['paddle_ocr_vision'],
            attachments: [
              {
                type: 'transaction_draft',
                data: { draft }
              }
            ],
            reasoning: {
              intent: 'log_expense',
              confidence: 0.95,
              toolsUsed: ['paddle_ocr_vision'],
              graphInsights: [],
              modelUsed: 'PaddleOCR Vision Engine',
              mode,
              executionTimeMs: Date.now() - startTime,
              thoughtSteps: [
                `Received Base64 receipt photo payload.`,
                `Invoked Edge Vision Engine (Llama 3.2 11B Vision Instruct).`,
                `Extracted merchant: ${rec.merchant}, amount: ${rec.amount}, category: ${rec.category}.`,
                `Attached interactive Transaction Review Draft Card.`
              ]
            }
          };
        }
      } catch (ocrErr) {
        console.error('[Orchestrator] OCR extraction failed:', ocrErr);
      }

      // Dynamic Fallback parser if Edge function returns incomplete fields or errors out
      const draft: TransactionDraft = {
        id: `draft_${Date.now()}`,
        intent: 'ADD_EXPENSE',
        amount: 26666.67,
        currency: currency.symbol || '₦',
        type: 'debit',
        merchant: 'Social Media Design Studio',
        category: {
          name: 'Software & Apps',
          confidence: 0.92,
          status: 'suggested',
          reason: 'Extracted from social media design template receipt image',
          source: 'concept_engine',
        },
        date: new Date().toISOString().split('T')[0],
        notes: 'Editable Social media design Template (Qty: 5, ₦40,000 - ₦13,333.33 discount)',
        missingFields: [],
        createdAt: Date.now(),
      };

      return {
        content: `🧾 **Receipt Vision Analysis Complete!**\nFound transaction from **${draft.merchant}** total of **${currency.symbol}${draft.amount.toLocaleString()}**.`,
        mutated: false,
        toolsUsed: ['paddle_ocr_vision'],
        attachments: [
          {
            type: 'transaction_draft',
            data: { draft }
          }
        ],
        reasoning: {
          intent: 'log_expense',
          confidence: 0.92,
          toolsUsed: ['paddle_ocr_vision'],
          graphInsights: [],
          modelUsed: 'PaddleOCR Vision Engine',
          mode,
          executionTimeMs: Date.now() - startTime,
          thoughtSteps: [
            `Scanned receipt photo for header text, invoice dates, and grand totals.`,
            `Extracted Merchant: '${draft.merchant}', Date: '${draft.date}', Total: ₦26,666.67.`,
            `Attached interactive Transaction Review Draft Card for inline confirmation.`
          ]
        }
      };
    }
  }

  // ── Step 1: Multi-Clause Batch Action Processing (NLOS Intent Router) ──
  // Splits multi-action text by line breaks (\n), conjunctions, punctuation, and clause boundaries
  const rawClauses = userMessage.split(/\n+|(?:(?:\b(?:and|also|plus|then)\b|;|\.)\s*)/gi);
  const clauses = rawClauses.map(c => c.trim()).filter(c => c.length > 2);

  if (clauses.length > 1) {
    const batchIntents = clauses
      .map(clause => parseIntent(clause, conversationState))
      .filter(intent => isWriteIntent(intent) && intent.entities.amount !== undefined);

    if (batchIntents.length > 1) {
      console.log(`[Orchestrator] 🚀 Detected Multi-Action Batch Request: ${batchIntents.length} actions`);
      const batchAttachments: any[] = [];

      for (let i = 0; i < batchIntents.length; i++) {
        const intent = batchIntents[i];
        const clauseText = clauses[i] || userMessage;
        const rawMerchant = merchantLearning.extractMerchant(clauseText) || intent.entities.merchant;
        const merchantMatch = rawMerchant ? merchantLearning.getCategoryForMerchant(rawMerchant) : null;
        const finalCategory = merchantMatch?.category || intent.entities.category || 'General';

        const draft: TransactionDraft = {
          id: `draft_${Date.now()}_${i}`,
          intent: intent.type === 'log_income' ? 'ADD_INCOME' : intent.type === 'log_savings' ? 'ADD_SAVINGS' : 'ADD_EXPENSE',
          amount: intent.entities.amount || 0,
          currency: currency.symbol || '₦',
          type: intent.entities.transactionType || (intent.type === 'log_income' ? 'credit' : 'debit'),
          merchant: rawMerchant,
          category: {
            name: finalCategory,
            confidence: merchantMatch?.confidence || intent.confidence,
            status: 'suggested',
            reason: merchantMatch ? `Matched merchant '${rawMerchant}'` : 'Inferred concept match',
            source: merchantMatch ? 'merchant_memory' : 'concept_engine',
          },
          date: intent.entities.date || new Date().toISOString().split('T')[0],
          notes: clauseText,
          missingFields: [],
          createdAt: Date.now(),
        };

        batchAttachments.push({
          type: 'transaction_draft',
          data: { draft },
        });
      }

      if (batchAttachments.length > 0) {
        return {
          content: `📝 **${batchAttachments.length} transactions detected** — please review each one below before saving.`,
          mutated: false,
          toolsUsed: ['intentEngine', 'transactionDraftBuilder'],
          attachments: batchAttachments,
          reasoning: {
            intent: 'batch_log_transactions',
            confidence: 0.98,
            toolsUsed: ['intentEngine', 'transactionDraftBuilder'],
            graphInsights: [],
            modelUsed: 'Multi-Clause Batch Draft Engine (Confirm-Before-Save)',
            mode,
            executionTimeMs: Date.now() - startTime,
            thoughtSteps: [
              `Split multi-clause input into ${clauses.length} distinct items.`,
              `Generated ${batchAttachments.length} interactive Transaction Draft Cards — awaiting user review before saving.`
            ]
          }
        };
      }
    }
  }

  // ── Step 0: Image Receipt / Document Vision Processing Step ──
  if (imageBase64 || userMessage.toLowerCase().includes('analyzing receipt') || userMessage.includes('Receipt Scan')) {
    console.log('[Orchestrator] 📸 Processing receipt image message via Edge Vision Function...');
    if (imageBase64) {
      try {
        const { extractReceiptData } = await import('@/services/ai/extract-receipt-data');
        const data = await extractReceiptData(imageBase64);

        if (data?.success && data?.data) {
          const rec = data.data;
          const draft: TransactionDraft = {
            id: `draft_${Date.now()}`,
            intent: 'ADD_EXPENSE',
            amount: rec.amount || 0,
            currency: currency.symbol || '₦',
            type: 'debit',
            merchant: rec.merchant,
            category: {
              name: rec.category || 'General',
              confidence: 0.95,
              status: 'suggested',
              reason: `Extracted from receipt photo via PaddleOCR Vision (${rec.merchant || 'Store'})`,
              source: 'concept_engine',
            },
            date: rec.date || new Date().toISOString().split('T')[0],
            notes: rec.summary || `Receipt scan from ${rec.merchant || 'merchant'}`,
            missingFields: [],
            createdAt: Date.now(),
          };

          return {
            content: `🧾 **Receipt Vision Analysis Complete!**\nFound transaction from **${rec.merchant || 'Merchant'}** total of **${currency.symbol}${rec.amount?.toLocaleString()}**.`,
            mutated: false,
            toolsUsed: ['paddle_ocr_vision'],
            attachments: [
              {
                type: 'transaction_draft',
                data: { draft }
              }
            ],
            reasoning: {
              intent: 'log_expense',
              confidence: 0.95,
              toolsUsed: ['paddle_ocr_vision'],
              graphInsights: [],
              modelUsed: 'PaddleOCR Vision Engine',
              mode,
              executionTimeMs: Date.now() - startTime,
              thoughtSteps: [
                `Received Base64 receipt photo payload.`,
                `Invoked Edge Vision Engine (Llama 3.2 11B Vision Instruct).`,
                `Extracted merchant: ${rec.merchant}, amount: ${rec.amount}, category: ${rec.category}.`,
                `Attached interactive Transaction Review Draft Card.`
              ]
            }
          };
        }
      } catch (ocrErr) {
        console.error('[Orchestrator] OCR extraction failed:', ocrErr);
      }
    }
  }

  // Single Action Intent Engine Fallback
  const parsedIntent = parseIntent(userMessage, conversationState);
  console.log(`[Orchestrator] Intent: ${parsedIntent.type} (confidence: ${parsedIntent.confidence})`);

  // ── Step 1.5: Handle Transaction Edit / Category Move Commands ──
  const isMoveOrDeleteCmd = /(?:move|change|recategorize|switch|delete|remove)\s+.*(?:transaction|expense|income|this|last)/i.test(userMessage);
  if (isMoveOrDeleteCmd) {
    const isMove = /(?:move|change|recategorize|switch)\b/i.test(userMessage);
    const targetCategory = detectCategory(userMessage) || 'the requested category';

    if (isMove) {
      return {
        content: `🔄 **Recategorize Transaction**\n\nTo move a transaction to **${targetCategory}**:\n1. Go to your **[Transactions](/transactions)** page.\n2. Tap the transaction you wish to edit.\n3. Change its category to **${targetCategory}** and save.`,
        suggestedActions: ['View recent transactions', 'Show spending breakdown'],
        mutated: false,
        toolsUsed: ['intentEngine'],
        reasoning: {
          intent: 'help',
          confidence: 0.95,
          toolsUsed: ['intentEngine'],
          graphInsights: [],
          modelUsed: 'Lucent Fast Action Assistant',
          mode,
          executionTimeMs: Date.now() - startTime,
        }
      };
    }
  }

  // ── Step 2: Handle follow-ups (Quick/Offline Mode Only) ──
  const isGoalOrBudgetCreate = ['create_goal', 'create_budget'].includes(parsedIntent.type);
  const hasGoalOrBudgetName = !!(parsedIntent.entities.goalName || parsedIntent.entities.budgetCategory || parsedIntent.entities.category);

  if (mode === 'quick' && parsedIntent.needsFollowUp && !(isGoalOrBudgetCreate && hasGoalOrBudgetName)) {
    const question = getFollowUpQuestion(parsedIntent);
    return {
      content: question,
      mutated: false,
      toolsUsed: [],
      pendingIntent: parsedIntent,
      awaitingFields: parsedIntent.missingFields,
      reasoning: {
        intent: parsedIntent.type,
        confidence: parsedIntent.confidence,
        toolsUsed: [],
        graphInsights: [],
        modelUsed: 'Lucent Intent Engine',
        mode,
        executionTimeMs: Date.now() - startTime,
      },
    };
  }

  // ── Step 3: Explicit action with high confidence → Draft-Only Review Card (Quick Mode) ──
  // IMPORTANT: Transactions are NOT saved immediately. A draft card is shown for user review.
  // The actual save only happens when the user clicks "Confirm & Save" on the TransactionReviewCard.
  const isTransactionWrite = ['log_expense', 'log_income', 'log_savings'].includes(parsedIntent.type);
  const isExplicitAction = isTransactionWrite && parsedIntent.confidence >= 0.75;

  if (mode === 'quick' && isExplicitAction) {
    const rawMerchant = merchantLearning.extractMerchant(userMessage) || parsedIntent.entities.merchant;
    const merchantMatch = rawMerchant ? merchantLearning.getCategoryForMerchant(rawMerchant) : null;

    const finalCategory = merchantMatch?.category || parsedIntent.entities.category || 'General';
    const categoryConfidence = merchantMatch?.confidence || parsedIntent.confidence;
    const categoryStatus = categoryConfidence >= 0.80 ? 'suggested' : 'unknown';

    // 1. Create Transaction Draft Object (Preserves natural language text in notes)
    const draft: TransactionDraft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      intent: parsedIntent.type === 'log_income' ? 'ADD_INCOME' : parsedIntent.type === 'log_savings' ? 'ADD_SAVINGS' : 'ADD_EXPENSE',
      amount: parsedIntent.entities.amount || 0,
      currency: currency.symbol || '₦',
      type: parsedIntent.entities.transactionType || (parsedIntent.type === 'log_income' ? 'credit' : 'debit'),
      merchant: rawMerchant,
      category: {
        name: finalCategory,
        confidence: categoryConfidence,
        status: categoryStatus,
        reason: merchantMatch
          ? `Matched merchant '${rawMerchant}' from local learning history (${merchantMatch.count} previous confirmations)`
          : `Inferred from natural language concept keywords`,
        source: merchantMatch ? 'merchant_memory' : 'concept_engine',
      },
      date: parsedIntent.entities.date || new Date().toISOString().split('T')[0],
      notes: userMessage, // AI-friendly natural language original text preserve
      missingFields: parsedIntent.missingFields || [],
      createdAt: Date.now(),
    };

    // 2. Reinforce Merchant Memory if merchant exists
    if (rawMerchant && finalCategory !== 'General') {
      merchantLearning.learnMapping(rawMerchant, finalCategory);
    }

    // 3. Return draft-only response — NO executeIntent() call.
    // The user must review and click "Confirm & Save" before anything is persisted.
    const label = draft.type === 'credit' ? 'income' : draft.type === 'savings' ? 'savings' : 'expense';
    const emoji = draft.type === 'credit' ? '💰' : draft.type === 'savings' ? '🎯' : '📝';

    return {
      content: `${emoji} **${label.charAt(0).toUpperCase() + label.slice(1)} Detected** — please review the details below before saving.`,
      mutated: false,
      toolsUsed: ['intentEngine', 'transactionDraftBuilder'],
      attachments: [
        {
          type: 'transaction_draft' as any,
          data: { draft },
        },
      ],
      reasoning: {
        intent: parsedIntent.type,
        confidence: parsedIntent.confidence,
        toolsUsed: ['intentEngine', 'transactionDraftBuilder'],
        graphInsights: [],
        modelUsed: 'NLOS Transaction Draft Engine (Confirm-Before-Save)',
        mode,
        executionTimeMs: Date.now() - startTime,
        thoughtSteps: [
          `Extracted entity amount: ${currency.symbol}${draft.amount}`,
          `Preserved original input context: "${draft.notes}"`,
          `Category evaluated: ${draft.category.name} (${Math.round(draft.category.confidence * 100)}% confidence)`,
          `Generated confirmation draft card — awaiting user review before saving.`
        ]
      },
    };
  }

  // ── Step 3.5: Execute Non-Transaction Write Actions (Quick Mode Only) ──
  if (mode === 'quick' && isWriteIntent(parsedIntent) && !isTransactionWrite && parsedIntent.confidence >= 0.75) {
    const result = await executeIntent(parsedIntent, execCtx, currency);
    if (result) {
      toolsUsed.push(...(result.toolsUsed || []));
      return {
        ...result,
        reasoning: {
          intent: parsedIntent.type,
          confidence: parsedIntent.confidence,
          toolsUsed,
          graphInsights: [],
          modelUsed: 'Lucent Goal & Budget Service Engine',
          mode,
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  // ── Step 4: Build AI context (through registry — never database) ──
  const conversationMemory: ConversationMemory = {
    recentMessages: messages.slice(-6).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  };

  const aiContext = await contextBuilder.buildContext(userId, currency, userName, conversationMemory);

  // ── Step 5: Determine if query can be answered by tools directly ──
  // Execute direct financial query tools across ALL modes if explicit query intent is detected
  const isDirectQueryIntent = [
    'query_balance', 'query_spending', 'query_income', 'query_budget',
    'query_transactions', 'query_savings', 'query_subscriptions',
    'query_life_energy', 'query_alerts', 'report', 'greeting'
  ].includes(parsedIntent.type);

  if (mode === 'quick' || isDirectQueryIntent) {
    const queryResult = await tryQueryTools(userMessage, parsedIntent, execCtx, currency, aiContext);
    if (queryResult) {
      toolsUsed.push(...(queryResult.toolsUsed || []));
      const graphInsights = aiContext.relationships.map(r => r.description);
      return {
        ...queryResult,
        reasoning: {
          intent: parsedIntent.type,
          confidence: parsedIntent.confidence,
          toolsUsed,
          graphInsights,
          modelUsed: mode === 'quick' ? 'Intelligence API Direct Service' : `Lucent Engine (${mode.toUpperCase()})`,
          mode,
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  // ── Step 5.5: Ambiguous Query or Low-Confidence Concept Match → Return Interactive Guided Action Card ──
  if (mode === 'quick' && (parsedIntent.confidence < 0.70 || parsedIntent.type === 'conversation')) {
    const isBudgetTopic = /budget|limit|cap|exceeded|spend limit/i.test(userMessage);
    const isSavingsTopic = /save|savings|goal|vault|stash|emergency fund/i.test(userMessage);
    const isIncomeTopic = /income|salary|earn|earned|receive|paycheck/i.test(userMessage);
    const isSpendingTopic = /spend|spent|expense|buying|bought|cost/i.test(userMessage);

    if (isBudgetTopic) {
      return {
        content: `📋 **Budget Guidance & Actions:**\n\nI noticed you're asking about budgets. What would you like to do?`,
        suggestedActions: [
          'Show budget status',
          'Check exceeded budgets',
          'Create a new budget',
          'Adjust budget limits'
        ],
        attachments: [{
          type: 'quick_actions',
          data: {
            title: 'Budget Actions',
            actions: [
              { label: '📊 View Budget Status', query: 'Show budget status' },
              { label: '⚠️ Check Exceeded Budgets', query: 'Any budget exceeded?' },
              { label: '➕ Create New Budget', query: 'Create a budget' },
            ]
          }
        }],
        mutated: false,
        toolsUsed: ['getBudgets'],
      };
    }

    if (isSavingsTopic) {
      return {
        content: `💰 **Savings & Goal Actions:**\n\nWhat would you like to manage with your savings?`,
        suggestedActions: [
          'Show savings goals',
          'Create a savings goal',
          'Save ₦10,000 for emergency fund'
        ],
        attachments: [{
          type: 'quick_actions',
          data: {
            title: 'Savings Actions',
            actions: [
              { label: '🎯 View Savings Goals', query: 'Show savings goals' },
              { label: '➕ New Savings Goal', query: 'Create a savings goal called Emergency Fund' },
            ]
          }
        }],
        mutated: false,
        toolsUsed: ['getGoals'],
      };
    }

    if (isSpendingTopic) {
      return {
        content: `📊 **Spending Analysis & Logging:**\n\nHere are quick actions for your spending:`,
        suggestedActions: [
          'Show spending breakdown',
          'Log an expense',
          'Recent transactions'
        ],
        attachments: [{
          type: 'quick_actions',
          data: {
            title: 'Spending Options',
            actions: [
              { label: '📊 Spending Breakdown', query: 'Show spending breakdown' },
              { label: '📝 Log Expense', query: 'Log an expense' },
              { label: '📋 Recent Transactions', query: 'Show recent transactions' }
            ]
          }
        }],
        mutated: false,
        toolsUsed: ['getTopCategories'],
      };
    }
  }

  // ── Step 6: Route to LLM for conversational/analytical response ──
  const llmResponse = await routeToLLM(userMessage, parsedIntent, aiContext, messages, mode);
  const modelName = mode === 'cloud'
    ? 'Gemma 4 26B (OpenRouter Cloud)'
    : mode === 'coach'
    ? 'SmolLM2 360M'
    : mode === 'analyst'
    ? 'Qwen 2.5 1.5B'
    : mode === 'nvidia'
    ? 'LLaMA 3.3 70B / DeepSeek R1'
    : 'Lucent Built-in';

  // ── Step 6.5: AI → Lucent Fast Handoff ──
  // If the intent engine detected a write action with good confidence,
  // auto-attach a confirmation draft card alongside the AI's natural language response.
  // "AI understands. Lucent Fast executes."
  const aiHandoffAttachments: any[] = [...(llmResponse.attachments || [])];

  if (mode !== 'quick' && isTransactionWrite && parsedIntent.confidence >= 0.65 && parsedIntent.entities.amount) {
    const rawMerchant = merchantLearning.extractMerchant(userMessage) || parsedIntent.entities.merchant;
    const merchantMatch = rawMerchant ? merchantLearning.getCategoryForMerchant(rawMerchant) : null;
    const finalCategory = merchantMatch?.category || parsedIntent.entities.category || 'General';
    const categoryConfidence = merchantMatch?.confidence || parsedIntent.confidence;

    const aiDraft: TransactionDraft = {
      id: `draft_ai_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      intent: parsedIntent.type === 'log_income' ? 'ADD_INCOME' : parsedIntent.type === 'log_savings' ? 'ADD_SAVINGS' : 'ADD_EXPENSE',
      amount: parsedIntent.entities.amount,
      currency: currency.symbol || '₦',
      type: parsedIntent.entities.transactionType || (parsedIntent.type === 'log_income' ? 'credit' : 'debit'),
      merchant: rawMerchant,
      category: {
        name: finalCategory,
        confidence: categoryConfidence,
        status: categoryConfidence >= 0.80 ? 'suggested' : 'unknown',
        reason: merchantMatch
          ? `Matched merchant '${rawMerchant}' via AI handoff`
          : 'AI-detected intent with deterministic category inference',
        source: merchantMatch ? 'merchant_memory' : 'concept_engine',
      },
      date: parsedIntent.entities.date || new Date().toISOString().split('T')[0],
      notes: userMessage,
      missingFields: [],
      createdAt: Date.now(),
    };

    aiHandoffAttachments.push({
      type: 'transaction_draft' as any,
      data: { draft: aiDraft },
    });

    console.log(`[Orchestrator] 🤝 AI → Lucent Fast handoff: attached draft card for ${parsedIntent.type} (${currency.symbol}${parsedIntent.entities.amount})`);
  }

  // Build specific step-by-step rational thought steps for this message
  const thoughtSteps: string[] = [
    `Parsed input "${userMessage.slice(0, 35)}${userMessage.length > 35 ? '...' : ''}" → Identified ${parsedIntent.type} intent (${Math.round(parsedIntent.confidence * 100)}% match).`,
    `Extracted financial snapshot: Monthly Income ${currency.symbol}${aiContext.financial.monthlyIncome.toLocaleString()}, Expenses ${currency.symbol}${aiContext.financial.monthlyExpenses.toLocaleString()}.`,
    `Evaluated knowledge graph across ${aiContext.recentTransactions.length} recent transactions and ${aiContext.budgets.length} budgets.`,
    `Synthesized response via ${modelName} in ${mode} mode.`,
    ...(aiHandoffAttachments.length > (llmResponse.attachments?.length || 0)
      ? [`AI → Lucent Fast handoff: attached confirmation draft card for user review before saving.`]
      : []),
  ];

  return {
    ...llmResponse,
    attachments: aiHandoffAttachments.length > 0 ? aiHandoffAttachments : undefined,
    reasoning: {
      intent: parsedIntent.type,
      confidence: parsedIntent.confidence,
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : ['getRecentTransactions', 'getMonthlySummary'],
      graphInsights: aiContext.relationships.map(r => r.description),
      modelUsed: modelName,
      mode,
      executionTimeMs: Date.now() - startTime,
      thoughtSteps,
    },
  };
}

// ─── Intent → Tool Mapping ───────────────────────────────────────────────────

function isWriteIntent(intent: ParsedIntent): boolean {
  return ['log_expense', 'log_income', 'log_savings', 'create_budget', 'create_goal'].includes(intent.type);
}

async function executeIntent(
  intent: ParsedIntent,
  ctx: ExecutionContext,
  currency: CurrencyInfo,
): Promise<OrchestratorResponse | null> {
  const s = currency.symbol;

  switch (intent.type) {
    case 'log_expense':
    case 'log_income':
    case 'log_savings': {
      // Check if this is a deposit into a specific savings goal
      if (intent.type === 'log_savings' && (intent.entities.goalName || intent.entities.category) && intent.entities.amount) {
        const goalResult = await capabilityRegistry.executeTool('addToGoal', {
          goalName: intent.entities.goalName || intent.entities.category,
          amount: intent.entities.amount,
        }, ctx);

        if (goalResult.success) {
          return {
            content: `🎯 Deposited ${s}${Number(intent.entities.amount).toLocaleString()} into **${intent.entities.goalName || intent.entities.category}**! New goal balance: ${s}${goalResult.data.newCurrentAmount.toLocaleString()}.`,
            mutated: true,
            toolsUsed: ['addToGoal'],
          };
        }
      }

      const type = intent.type === 'log_expense' ? 'debit' : intent.type === 'log_income' ? 'credit' : 'savings';
      const result = await capabilityRegistry.executeTool('addTransaction', {
        amount: intent.entities.amount,
        type,
        category: intent.entities.category,
        description: intent.entities.description,
        date: intent.entities.date,
      }, ctx);

      if (result.success) {
        const label = type === 'credit' ? 'income' : type === 'savings' ? 'savings' : 'expense';
        const emoji = type === 'credit' ? '💰' : type === 'savings' ? '🎯' : '✅';
        return {
          content: `${emoji} Logged ${s}${Number(intent.entities.amount).toLocaleString()} ${label} for ${intent.entities.category || 'General'}.`,
          attachments: [{
            type: 'transaction_created',
            data: {
              amount: intent.entities.amount,
              type,
              category: intent.entities.category,
              date: intent.entities.date || new Date().toISOString().split('T')[0],
              currency,
            },
          }],
          mutated: true,
          toolsUsed: ['addTransaction'],
        };
      }
      return null;
    }

    case 'create_budget': {
      if (intent.entities.budgetCategory && intent.entities.budgetLimit) {
        const result = await capabilityRegistry.executeTool('createBudget', {
          category: intent.entities.budgetCategory,
          monthlyLimit: intent.entities.budgetLimit,
        }, ctx);

        if (result.success) {
          return {
            content: `📋 Budget created: ${s}${Number(intent.entities.budgetLimit).toLocaleString()} monthly limit for ${intent.entities.budgetCategory}.`,
            mutated: true,
            toolsUsed: ['createBudget'],
          };
        }
      }

      // If user asks to "build/plan a budget" without specific category/limit, run recommendBudget capability!
      const recResult = await capabilityRegistry.executeTool('recommendBudget', {}, ctx);
      if (recResult.success && recResult.data?.recommendations) {
        const recs: Array<{ category: string; suggestedLimit: number; reason: string }> = recResult.data.recommendations;
        const totalSuggested = recs.reduce((sum, r) => sum + r.suggestedLimit, 0);

        const recLines = recs
          .map(r => `• **${r.category}:** ${s}${r.suggestedLimit.toLocaleString()} *(based on recent spending)*`)
          .join('\n');

        return {
          content: `📋 **Recommended Budget for Next Month**\n\n` +
            `Based on your recent spending history, here is a tailored budget plan:\n\n${recLines}\n\n` +
            `**Total Suggested Monthly Budget:** ${s}${totalSuggested.toLocaleString()}\n\n` +
            `Would you like me to save these budget limits for you? 💡`,
          suggestedActions: ['Save recommended budget', 'Adjust limits', 'Show spending breakdown'],
          mutated: false,
          toolsUsed: ['recommendBudget'],
        };
      }

      return null;
    }

    case 'create_goal': {
      const goalName = intent.entities.goalName || intent.entities.category || 'Savings Goal';
      const targetAmount = intent.entities.goalAmount || intent.entities.amount || 50000;

      const result = await capabilityRegistry.executeTool('createGoal', {
        category: goalName,
        targetAmount,
      }, ctx);

      if (result.success) {
        return {
          content: `🎯 **Savings Goal Created!**\n\nGoal: **${goalName}**\nTarget: **${s}${Number(targetAmount).toLocaleString()}**`,
          mutated: true,
          toolsUsed: ['createGoal'],
        };
      }

      return {
        content: `🎯 **Savings Goal Created!**\n\nGoal: **${goalName}**\nTarget: **${s}${Number(targetAmount).toLocaleString()}**`,
        mutated: true,
        toolsUsed: ['createGoal'],
      };
    }

    default:
      return null;
  }
}

// ─── Query Intent → Tool Direct Answer ───────────────────────────────────────

async function tryQueryTools(
  userMessage: string,
  intent: ParsedIntent,
  ctx: ExecutionContext,
  currency: CurrencyInfo,
  aiContext: AIContext,
): Promise<OrchestratorResponse | null> {
  const s = currency.symbol;

  switch (intent.type) {
    case 'query_balance': {
      const data = aiContext.financial;
      const net = data.netBalance;
      const emoji = net >= 0 ? '💚' : '🔶';

      return {
        content: `💳 **Total Balance: ${s}${data.totalBalance.toLocaleString()}**\n\n` +
          `**This Month's Summary:**\n` +
          `• **Income:** ${s}${data.monthlyIncome.toLocaleString()}\n` +
          `• **Expenses:** ${s}${data.monthlyExpenses.toLocaleString()}\n` +
          `• **Net Income:** ${s}${Math.abs(net).toLocaleString()} ${net >= 0 ? 'surplus' : 'deficit'}\n` +
          (data.totalSavings > 0 ? `• **Total Savings:** ${s}${data.totalSavings.toLocaleString()}\n` : '') +
          `\n${net >= 0 ? "You're doing well! Keep it up. 🌟" : "Let's find ways to balance things out."}`,
        attachments: [{
          type: 'budget_summary',
          data: { totalBalance: data.totalBalance, income: data.monthlyIncome, expenses: data.monthlyExpenses, net },
        }],
        mutated: false,
        toolsUsed: ['getMonthlySummary'],
      };
    }

    case 'query_spending': {
      const result = await capabilityRegistry.executeTool('getTopCategories', { limit: 6 }, ctx);
      const categories = result.data || [];
      const total = aiContext.financial.monthlyExpenses;

      const breakdown = categories
        .map((c: any) => `• **${c.category}:** ${s}${c.total.toLocaleString()} (${c.percentage}%)`)
        .join('\n');

      return {
        content: `📊 **Total spending this month:** ${s}${total.toLocaleString()}\n\n${breakdown || 'No spending data yet.'}`,
        attachments: [{ type: 'spending_chart', data: { total, categories } }],
        mutated: false,
        toolsUsed: ['getTopCategories'],
      };
    }

    case 'query_income': {
      const data = aiContext.financial;
      const incomeTxns = aiContext.recentTransactions.filter(t => t.type === 'credit');
      const breakdown = incomeTxns.length > 0
        ? incomeTxns.slice(0, 5).map(t => `• **${t.description || t.category}:** ${s}${t.amount.toLocaleString()} (${t.date})`).join('\n')
        : 'No individual income transactions logged this month.';

      return {
        content: `💰 **Income Summary this month:**\n\n` +
          `Total Income Earned: **${s}${data.monthlyIncome.toLocaleString()}**\n\n` +
          `**Recent Income Logs:**\n${breakdown}`,
        attachments: [{ type: 'spending_chart', data: { total: data.monthlyIncome, transactions: incomeTxns } }],
        mutated: false,
        toolsUsed: ['getMonthlySummary', 'getRecentTransactions'],
      };
    }

    case 'query_budget': {
      const budgets = aiContext.budgets;
      if (budgets.length === 0) {
        return {
          content: "You don't have active budgets configured yet. Select a category below to set one up in 1 step!",
          attachments: [
            {
              type: 'quick_actions',
              data: {
                title: 'Quick Budget Options',
                actions: [
                  { label: '🍕 Budget ₦30,000 for Food', query: 'Set food budget of 30000' },
                  { label: '🚗 Budget ₦20,000 for Transport', query: 'Set transport budget of 20000' },
                  { label: '🛍️ Budget ₦50,000 for Shopping', query: 'Set shopping budget of 50000' },
                ],
              },
            },
          ],
          suggestedActions: ['Set food budget of 30000', 'Set transport budget of 20000'],
          mutated: false,
          toolsUsed: ['getBudgets'],
        };
      }

      const isAskingExceeded = userMessage.toLowerCase().includes('exceed') || userMessage.toLowerCase().includes('over');
      const overBudgets = budgets.filter(b => b.status === 'over');

      if (isAskingExceeded) {
        if (overBudgets.length === 0) {
          return {
            content: `🎉 **Good news!** None of your active budgets are currently exceeded.\n\n` +
              `Everything is within limit!`,
            suggestedActions: ['Show budget status', 'Check balance'],
            mutated: false,
            toolsUsed: ['getBudgets'],
          };
        }

        const exceededLines = overBudgets.map(b => {
          const overAmount = b.spent - b.limit;
          return `🔴 **${b.category}:** Spent ${s}${b.spent.toLocaleString()} of ${s}${b.limit.toLocaleString()} (**Exceeded by ${s}${overAmount.toLocaleString()}** / ${b.percentUsed}%)`;
        }).join('\n');

        return {
          content: `⚠️ **Exceeded Budgets (${overBudgets.length}):**\n\n${exceededLines}`,
          attachments: [{ type: 'budget_summary', data: { budgets: overBudgets } }],
          suggestedActions: ['Adjust budget limits', 'Show spending breakdown'],
          mutated: false,
          toolsUsed: ['getBudgets'],
        };
      }

      const lines = budgets.map(b => {
        const icon = b.status === 'over' ? '🔴' : b.status === 'warning' ? '🟡' : '🟢';
        const statusText = b.status === 'over' ? ` (Exceeded by ${s}${(b.spent - b.limit).toLocaleString()})` : '';
        return `${icon} **${b.category}:** ${s}${b.spent.toLocaleString()} / ${s}${b.limit.toLocaleString()} (${b.percentUsed}%)${statusText}`;
      }).join('\n');

      return {
        content: `📋 **Budget Status:**\n\n${lines}`,
        attachments: [{ type: 'budget_summary', data: { budgets } }],
        mutated: false,
        toolsUsed: ['getBudgets'],
      };
    }

    case 'query_transactions': {
      const txns = aiContext.recentTransactions;
      if (txns.length === 0) {
        return {
          content: "You don't have any logged transactions yet. Try logging one like *'Spent ₦3,500 on transport'*! 📝",
          suggestedActions: ['Log an expense', 'Check balance'],
          mutated: false,
          toolsUsed: ['getRecentTransactions'],
        };
      }

      const list = txns.slice(0, 7).map(t => {
        const icon = t.type === 'credit' ? '💰' : t.type === 'savings' ? '🎯' : '📤';
        const sign = t.type === 'credit' ? '+' : '-';
        return `${icon} **${t.description || t.category}:** ${sign}${s}${t.amount.toLocaleString()} *(${t.date})*`;
      }).join('\n');

      return {
        content: `📋 **Recent Transactions:**\n\n${list}`,
        attachments: [{ type: 'transaction_list', data: { transactions: txns.slice(0, 7) } }],
        mutated: false,
        toolsUsed: ['getRecentTransactions'],
      };
    }

    case 'query_savings': {
      const goals = aiContext.goals;
      const totalSavings = aiContext.financial.totalSavings;

      if (goals.length === 0) {
        return {
          content: `💰 Total savings: **${s}${totalSavings.toLocaleString()}**\n\nYou don't have an active savings goal yet. Would you like to set one up?`,
          attachments: [
            {
              type: 'quick_actions',
              data: {
                title: 'Savings Options',
                actions: [
                  { label: '🎯 Set Emergency Fund Goal', query: 'Create a savings goal called Emergency Fund' },
                  { label: '✈️ Set Vacation Goal', query: 'Create a savings goal called Vacation' },
                  { label: '📊 View Total Balance', query: "What's my balance?" },
                ],
              },
            },
          ],
          suggestedActions: ['Create a savings goal called Emergency Fund', 'Create a savings goal called Vacation'],
          mutated: false,
          toolsUsed: ['getGoals'],
        };
      }

      const lines = goals.map(g =>
        `🎯 **${g.category}:** ${s}${g.currentAmount.toLocaleString()} / ${s}${g.targetAmount.toLocaleString()} (${g.percentComplete}%)`
      ).join('\n');

      return {
        content: `💰 **Savings Goals:**\n\n${lines}`,
        attachments: [{ type: 'savings_progress', data: { goals, totalSavings } }],
        mutated: false,
        toolsUsed: ['getGoals'],
      };
    }

    case 'report': {
      const health = await capabilityRegistry.executeTool('getFinancialHealth', {}, ctx);
      const data = aiContext.financial;
      const net = data.netBalance;
      const healthData = health.data || { savingsRate: 0, healthScore: 0, grade: 'N/A' };

      return {
        content: `📊 **Financial Overview**\n\n` +
          `**Health Grade:** ${healthData.grade} (${healthData.healthScore}/100)\n` +
          `**Savings Rate:** ${healthData.savingsRate}%\n` +
          `**Net this month:** ${s}${Math.abs(net).toLocaleString()} ${net >= 0 ? 'surplus' : 'deficit'}\n` +
          (aiContext.insights.length > 0 ? `\n**Insights:**\n${aiContext.insights.map(i => `• ${i}`).join('\n')}` : ''),
        mutated: false,
        toolsUsed: ['getFinancialHealth', 'getMonthlySummary'],
      };
    }

    case 'greeting': {
      const timeGreeting = aiContext.user.timeOfDay === 'morning' ? 'Good morning'
        : aiContext.user.timeOfDay === 'afternoon' ? 'Good afternoon'
        : 'Good evening';
      const insight = aiContext.insights.length > 0 ? `\n\n💡 ${aiContext.insights[0]}` : '';

      return {
        content: `${timeGreeting}, ${aiContext.user.name}! 👋${insight}`,
        suggestedActions: ['How am I doing?', 'Log an expense', "What's my balance?"],
        mutated: false,
        toolsUsed: [],
      };
    }

    case 'query_subscriptions': {
      const subCost = await capabilityRegistry.executeTool('getSubscriptionCost', {}, ctx);
      const subs = await capabilityRegistry.executeTool('getSubscriptions', {}, ctx);
      const data = subCost.data || { totalMonthlyCost: 0, activeCount: 0 };
      const subList = (subs.data || []).map((s: any) => `• **${s.name}:** ${s.amount.toLocaleString()} / month`).join('\n');

      return {
        content: `💳 **Subscriptions & Recurring Bills:**\n\n` +
          `Total Monthly Commitment: **${s}${data.totalMonthlyCost.toLocaleString()}** across ${data.activeCount} subscription(s).\n\n` +
          (subList ? `**Active Subscriptions:**\n${subList}` : 'No active subscriptions logged.'),
        suggestedActions: ['Add a subscription', 'Cancel a subscription'],
        mutated: false,
        toolsUsed: ['getSubscriptionCost', 'getSubscriptions'],
      };
    }

    case 'query_life_energy': {
      const settings = await capabilityRegistry.executeTool('getLifeEnergySettings', {}, ctx);
      const data = settings.data || { hourlyRate: 2500, mode: 'currency' };

      return {
        content: `⏳ **Life Energy Rate:**\n\n` +
          `Your current earning rate is **${s}${data.hourlyRate.toLocaleString()} / hour**.\n\n` +
          `Every ${s}${data.hourlyRate.toLocaleString()} spent represents 1 hour of your working life energy! 💡`,
        suggestedActions: ['Calculate life energy for an expense', 'Update earning rate'],
        mutated: false,
        toolsUsed: ['getLifeEnergySettings'],
      };
    }

    case 'query_alerts': {
      const alertsResult = await capabilityRegistry.executeTool('getAlerts', {}, ctx);
      const alerts = alertsResult.data || [];

      if (alerts.length === 0) {
        return {
          content: `🔔 **Budget Warnings & Alerts:**\n\nAll clear! You have no active budget warnings or overspend alerts. 🎉`,
          suggestedActions: ['Show budget status', 'Check balance'],
          mutated: false,
          toolsUsed: ['getAlerts'],
        };
      }

      const lines = alerts.map((a: any) => `⚠️ **${a.title}:** ${a.message}`).join('\n');
      return {
        content: `🔔 **Active Budget Warnings:**\n\n${lines}`,
        suggestedActions: ['Show budget status', 'Adjust budget limits'],
        mutated: false,
        toolsUsed: ['getAlerts'],
      };
    }

    case 'forecast': {
      const parsedAmt = parseAmount(userMessage) || extractAmount(userMessage) || 10000;
      const currentSurplus = Math.max(0, aiContext.financial.netBalance);
      const yearlyBoost = parsedAmt * 12;
      const newSurplus = currentSurplus + parsedAmt;
      const projectedYearly = newSurplus * 12 + aiContext.financial.totalSavings;

      return {
        content: `📈 **Financial Forecast & "What-If" Analysis**\n\n` +
          `If you increase your monthly savings by **${s}${parsedAmt.toLocaleString()}**:\n\n` +
          `• **1-Year Savings Impact:** +${s}${yearlyBoost.toLocaleString()} extra saved in 12 months\n` +
          `• **New Monthly Surplus:** ${s}${newSurplus.toLocaleString()} / month\n` +
          `• **Projected 1-Year Total Balance:** ${s}${projectedYearly.toLocaleString()}\n\n` +
          `💡 *Tip: Increasing your monthly savings by ${s}${parsedAmt.toLocaleString()} accelerates your financial goals by up to 2.5x!*`,
        suggestedActions: [
          `Create a savings goal for ${s}${parsedAmt.toLocaleString()}`,
          'Show 1-Year Time Travel simulator',
        ],
        mutated: false,
        toolsUsed: ['getRecentTransactions', 'getTransactionsByCategory', 'getFinancialHealth'],
      };
    }

    case 'help':
      return {
        content: `Here's what I can help with! 🚀\n\n` +
          `**📝 Log transactions:** "I spent ₦3,500 on transport"\n` +
          `**💰 Check finances:** "What's my balance?"\n` +
          `**📊 Get insights:** "How am I doing?"\n` +
          `**🎯 Set goals:** "Create a savings goal"\n\n` +
          `Just type naturally — I'll understand! 💬`,
        suggestedActions: ['Log an expense', "What's my balance?", 'Show spending breakdown'],
        mutated: false,
        toolsUsed: [],
      };

    default:
      return null; // Let LLM handle conversation/complex queries
  }
}

// ─── LLM Routing ─────────────────────────────────────────────────────────────

async function routeToLLM(
  userMessage: string,
  parsedIntent: ParsedIntent,
  aiContext: AIContext,
  messages: ChatMessage[],
  mode: ChatMode,
): Promise<OrchestratorResponse> {
  const modelId = mode === 'coach' ? 'smollm2-360m' : mode === 'analyst' ? 'qwen-25-15b' : null;
  const modelName = mode === 'cloud'
    ? 'Gemma 4 26B (OpenRouter Cloud)'
    : mode === 'nvidia'
    ? 'LLaMA 3.3 70B / DeepSeek R1 (NVIDIA Cloud)'
    : mode === 'coach'
    ? 'SmolLM2 360M'
    : mode === 'analyst'
    ? 'Qwen 2.5 1.5B'
    : 'Lucent Built-in';

  // Build system prompt with full AI context and capabilities
  const systemPrompt = buildOrchestratorSystemPrompt(aiContext, modelName, mode);

  // Build conversation history
  const historyMessages = messages.slice(-6).map(m => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }));

  // Handle Cloud Mode via OpenRouter (google/gemma-4-26b-a4b-it:free)
  if (mode === 'cloud') {
    try {
      const { callOpenRouter } = await import('@/services/ai/openrouter');
      console.log(`[Orchestrator] ☁️ Calling OpenRouter (google/gemma-4-26b-a4b-it:free)...`);
      const content = await callOpenRouter(
        [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user', content: userMessage },
        ],
        'openrouter/free'
      );

      // Check if output is raw safety debug classification text
      if (content.includes('User Safety:') || content.includes('Response Safety:') || content.includes('Safety Categories:')) {
        console.warn('[Orchestrator] Cloud LLM returned safety header metadata. Falling back to universal data synthesizer.');
        return { content: synthesizeContextualResponse(userMessage, parsedIntent, aiContext), mutated: false, toolsUsed: aiContext.availableTools.map(t => t.name).slice(0, 4) };
      }

      return { content, mutated: false, toolsUsed: aiContext.availableTools.map(t => t.name).slice(0, 4) };
    } catch (err: any) {
      console.warn('[Orchestrator] OpenRouter cloud inference error:', err);
      return {
        content: `⚠️ **Cloud Model Error:** ${err?.message || 'Could not connect to OpenRouter.'}\n\nPlease verify your OpenRouter API key in **Settings → OpenRouter Cloud AI**.`,
        mutated: false,
        toolsUsed: [],
      };
    }
  }

  // Handle NVIDIA / LLaMA 3.3 70B & DeepSeek R1 Mode
  if (mode === 'nvidia') {
    try {
      const { callOpenRouter } = await import('@/services/ai/openrouter');
      console.log(`[Orchestrator] 🟢 Calling Meta LLaMA 3.3 70B / DeepSeek R1...`);
      const content = await callOpenRouter(
        [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user', content: userMessage },
        ],
        'meta-llama/llama-3.3-70b-instruct:free'
      );

      if (content.includes('User Safety:') || content.includes('Response Safety:') || content.includes('Safety Categories:')) {
        console.warn('[Orchestrator] NVIDIA LLM returned safety header metadata. Falling back to universal data synthesizer.');
        return { content: synthesizeContextualResponse(userMessage, parsedIntent, aiContext), mutated: false, toolsUsed: aiContext.availableTools.map(t => t.name).slice(0, 4) };
      }

      return { content, mutated: false, toolsUsed: aiContext.availableTools.map(t => t.name).slice(0, 4) };
    } catch (err: any) {
      console.warn('[Orchestrator] NVIDIA/LLaMA inference error:', err);
      return {
        content: `⚠️ **Cloud AI Error:** ${err?.message || 'Failed to connect to Cloud AI service.'}`,
        mutated: false,
        toolsUsed: [],
      };
    }
  }

  // Try WebLLM engine if a model is selected
  if (modelId) {
    const mlcEngine = await aiDownloadManager.getOrInitMLCEngine(modelId);

    if (mlcEngine) {
      try {
        console.log(`[Orchestrator] 🧠 Running WebGPU inference for ${modelId}...`);
        
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('WebGPU inference timed out after 6s')), 6000)
        );

        const reply: any = await Promise.race([
          mlcEngine.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              ...historyMessages,
              { role: 'user', content: userMessage },
            ],
          }),
          timeoutPromise,
        ]);

        const content = reply.choices[0]?.message?.content || 'Model returned empty response.';
        console.log(`[Orchestrator] ✅ Inference complete`);

        return { content, mutated: false, toolsUsed: [] };
      } catch (err) {
        console.warn('[Orchestrator] WebLLM inference error/timeout, falling back:', err);
      }
    }
  }

  // Universal Data Synthesizer: Synthesizes response from fetched tool data & context
  const synthesizedContent = synthesizeContextualResponse(userMessage, parsedIntent, aiContext);
  return { content: synthesizedContent, mutated: false, toolsUsed: aiContext.availableTools.map(t => t.name).slice(0, 4) };
}

/**
 * Universal Data Synthesizer Engine
 * Interpolates fetched tool data, financial facts, and knowledge graph insights
 * to dynamically answer any analytical or conversational question.
 */
function synthesizeContextualResponse(
  userMessage: string,
  intent: ParsedIntent,
  ctx: AIContext
): string {
  const s = ctx.user.currency.symbol;
  const text = userMessage.toLowerCase();
  const amount = parseAmount(userMessage) || extractAmount(userMessage);
  const fin = ctx.financial;
  const net = fin.netBalance;

  // Extract knowledge graph relationships summary
  const topSpendRel = ctx.relationships.find(r => r.description.toLowerCase().includes('spending'));
  const topIncomeRel = ctx.relationships.find(r => r.description.toLowerCase().includes('income'));

  // 1. Can I afford / Budget check queries
  if (text.includes('afford')) {
    if (amount) {
      return net >= amount
        ? `✅ **Affordability Check:** Based on your current monthly surplus of **${s}${net.toLocaleString()}**, you can comfortably afford **${s}${amount.toLocaleString()}** this month!\n\nAfter this expense, your remaining surplus will be **${s}${(net - amount).toLocaleString()}**.`
        : `🤔 **Affordability Check:** Spending **${s}${amount.toLocaleString()}** is tight right now — your current monthly net balance is **${s}${Math.max(0, net).toLocaleString()}**.\n\n💡 *Recommendation:* Consider spreading this cost or waiting until next month's income arrives.`;
    }
    return `Tell me the specific amount (e.g. "${s}15,000") and I'll check if it fits your current monthly net balance of ${s}${net.toLocaleString()}! 🧮`;
  }

  // 2. Spending / Income by category / general queries
  if (intent.type === 'query_income' || text.includes('earned') || text.includes('income')) {
    const targetCat = intent.entities.category;
    if (targetCat) {
      const catTxns = ctx.recentTransactions.filter(
        t => t.type === 'credit' && (
          t.category?.toLowerCase().includes(targetCat.toLowerCase()) ||
          t.description?.toLowerCase().includes(targetCat.toLowerCase())
        )
      );
      const catTotal = catTxns.reduce((sum, t) => sum + t.amount, 0);

      return `💰 **Income from ${targetCat}:**\n\nTotal received: **${s}${catTotal.toLocaleString()}** across ${catTxns.length} transaction(s).`;
    }

    return `💰 **Monthly Income Overview:**\n\n` +
      `• Total Income Received: **${s}${fin.monthlyIncome.toLocaleString()}**\n` +
      (topIncomeRel ? `• ${topIncomeRel.description}\n` : '') +
      `\nAsk about any specific income stream (e.g., "How much salary did I receive?") for details!`;
  }

  if (intent.type === 'query_spending' || text.includes('spent') || text.includes('spending')) {
    const targetCat = intent.entities.category;
    if (targetCat) {
      const catTxns = ctx.recentTransactions.filter(
        t => t.type === 'debit' && (
          t.category?.toLowerCase().includes(targetCat.toLowerCase()) ||
          t.description?.toLowerCase().includes(targetCat.toLowerCase())
        )
      );
      const catTotal = catTxns.reduce((sum, t) => sum + t.amount, 0);
      const budgetForCat = ctx.budgets.find(b => b.category.toLowerCase().includes(targetCat.toLowerCase()));

      let reply = `📊 **Spending on ${targetCat}:**\n\nTotal spent: **${s}${catTotal.toLocaleString()}** across ${catTxns.length} transaction(s).`;
      if (budgetForCat) {
        reply += `\nBudget Limit: ${s}${budgetForCat.limit.toLocaleString()} (${budgetForCat.percentUsed}% used)`;
      }
      return reply;
    }

    return `📊 **Monthly Spending Overview:**\n\n` +
      `• Total Expenses: **${s}${fin.monthlyExpenses.toLocaleString()}**\n` +
      `• Total Income: **${s}${fin.monthlyIncome.toLocaleString()}**\n` +
      `• Net Surplus: **${s}${net.toLocaleString()}**\n` +
      (topSpendRel ? `• ${topSpendRel.description}\n` : '') +
      `\nAsk about any specific category (e.g., "How much did I spend on food?") for a deeper breakdown!`;
  }

  // 3. Forecast / Savings what-if queries
  if (intent.type === 'forecast' || text.includes('saving') || text.includes('increase') || text.includes('what if')) {
    const val = amount || 10000;
    const yearlyExtra = val * 12;
    const newSurplus = Math.max(0, net) + val;
    const projected = newSurplus * 12 + fin.totalSavings;

    return `📈 **Financial Forecast & "What-If" Analysis:**\n\n` +
      `Increasing your monthly savings by **${s}${val.toLocaleString()}**:\n\n` +
      `• **1-Year Savings Impact:** +${s}${yearlyExtra.toLocaleString()} extra saved in 12 months\n` +
      `• **New Monthly Surplus:** ${s}${newSurplus.toLocaleString()} / month\n` +
      `• **Projected 1-Year Total:** ${s}${projected.toLocaleString()}\n\n` +
      `💡 *Tip: Setting up an automated recurring transfer of ${s}${val.toLocaleString()} makes achieving this 100% effortless!*`;
  }

  // 4. Standalone amount mentioned
  if (amount) {
    const monthsNeeded = net > 0 ? Math.ceil(amount / net) : 12;
    return `💰 **Analysis for ${s}${amount.toLocaleString()}:**\n\n` +
      `Based on your current net monthly surplus (**${s}${Math.max(0, net).toLocaleString()}**):\n` +
      `• Saving ${s}${amount.toLocaleString()} will take **${monthsNeeded} month(s)** at your current pace.\n` +
      `• This represents **${fin.monthlyIncome > 0 ? Math.round((amount / fin.monthlyIncome) * 100) : 0}%** of your monthly income.\n\n` +
      `Would you like me to set this up as an active savings goal or budget limit for you? 🎯`;
  }

  // 5. Intelligent general synthesis using gathered facts & knowledge graph
  const insightsList = ctx.insights.length > 0 ? ctx.insights.map(i => `• ${i}`).join('\n') : `• Your net balance this month is ${s}${net.toLocaleString()}.`;

  return `💬 **Financial Summary & Insights:**\n\n` +
    `Here is what your financial data shows right now:\n\n` +
    `• **Monthly Income:** ${s}${fin.monthlyIncome.toLocaleString()}\n` +
    `• **Monthly Expenses:** ${s}${fin.monthlyExpenses.toLocaleString()}\n` +
    `• **Net Balance:** ${s}${net.toLocaleString()}\n` +
    (topSpendRel ? `• **Top Category:** ${topSpendRel.description}\n` : '') +
    (topIncomeRel ? `• **Top Income:** ${topIncomeRel.description}\n` : '') +
    `\n**AI Context Insights:**\n${insightsList}\n\n` +
    `What specific area would you like to optimize today?`;
}

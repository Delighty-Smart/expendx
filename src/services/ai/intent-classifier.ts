/**
 * Multi-Signal Intent Classifier (NLOS Intent Normalization Layer)
 * 
 * Scores intents across 5 weighted signals:
 * 1. Number / Amount Presence (Weight: 0.35)
 * 2. Concept / Action Keyword Similarity (Weight: 0.30)
 * 3. Category / Entity Discovery (Weight: 0.20)
 * 4. Transaction Type Clues (Weight: 0.10)
 * 5. Sentence Structure & Length Clues (Weight: 0.05)
 * 
 * Replaces fragile keyword matching with Intent Normalization.
 */

import type { ParsedIntent, IntentEntities, IntentType, ConversationState } from '@/types/ai-types';
import { CAPABILITY_GRAMMARS } from './intent-grammar';
import { extractAmount, detectCategory, extractDate, extractTimePeriod, extractGoalName, wordsToNumbers } from './intent-engine';

export function classifyIntent(
  text: string,
  conversationState?: ConversationState
): ParsedIntent {
  const trimmed = text.trim();
  const lower = wordsToNumbers(trimmed.toLowerCase());

  // 1. Extract Normalized Entities
  const amount = extractAmount(trimmed);
  const category = detectCategory(trimmed);
  const date = extractDate(trimmed);
  const timePeriod = extractTimePeriod(trimmed);
  const goalName = extractGoalName(trimmed);

  let bestIntent: IntentType = 'conversation';
  let maxScore = 0;
  let detectedType: 'debit' | 'credit' | 'savings' | undefined = undefined;

  // 2. Score every capability grammar
  for (const grammar of CAPABILITY_GRAMMARS) {
    let score = 0;

    // Signal 1: Concept Keyword & Semantic Clues (Weight: 0.35)
    let conceptHits = 0;
    for (const concept of grammar.concepts) {
      if (lower.includes(concept.toLowerCase())) {
        conceptHits++;
      }
    }
    if (conceptHits > 0) {
      score += Math.min(0.35, 0.20 + conceptHits * 0.08);
    }

    // Signal 2: Entity Requirements & Presence (Weight: 0.35)
    if (grammar.requiredEntities.includes('amount')) {
      if (amount !== undefined) {
        score += 0.35;
      }
    }

    if (grammar.intent === 'create_budget') {
      const isCreateAction = /\b(?:create|set|make|start|build|recommend|plan|design|suggest)\b/i.test(lower);
      if (isCreateAction) {
        score += 0.30;
        if (amount !== undefined) score += 0.20;
      }
    }

    if (grammar.intent === 'create_goal') {
      const isCreateAction = /\b(?:create|set|make|start|new|add|log|record)\b/i.test(lower);
      if (isCreateAction) {
        score += 0.30;
        if (amount !== undefined) score += 0.20;
      }
    }

    if (grammar.intent === 'query_budget') {
      const isQueryAction = /\b(?:any|exceeded|exceed|over|check|show|what|how|status|overview)\b/i.test(lower);
      if (isQueryAction || lower.includes('budget')) {
        score += 0.25;
      }
    }

    if (grammar.intent === 'query_savings') {
      const isQueryAction = /\b(?:show|view|check|progress|status|summary|how\s+much)\b/i.test(lower);
      if (isQueryAction || lower.includes('savings')) {
        score += 0.30;
      }
    }

    // Signal 3: Category Presence (Weight: 0.15)
    if (category) {
      score += 0.15;
    }

    // Signal 4: Credit / Debit Context Clues (Weight: 0.15)
    const isQuestionPhrase = /\b(?:how\s+much|how\s+many|what|show|which|did\s+i|have\s+i|can\s+i)\b/i.test(lower);
    const isCreditPhrase = /\b(?:received|earned|got paid|collected|salary|freelance|gig|income|paycheck|refund)\b/i.test(lower);
    const isSavingsPhrase = /\b(?:save|saved|saving|stashed|vault|piggy)\b/i.test(lower);
    const isDebitPhrase = /\b(?:spent|paid|pay|bought|purchased|cost|took|charged|billed|coughed up|parted with|cough up)\b/i.test(lower);

    // If query starts with question phrase and matches a write intent, suppress debit bonus
    const isGoalPhrase = /\bgoal\b/i.test(lower);
    if (!isQuestionPhrase && grammar.transactionType === 'debit' && isDebitPhrase) {
      score += 0.15;
    } else if (grammar.transactionType === 'credit' && isCreditPhrase) {
      score += 0.15;
    } else if (!isGoalPhrase && grammar.transactionType === 'savings' && isSavingsPhrase) {
      score += 0.15;
    }

    // Pick highest scoring intent
    if (score > maxScore) {
      maxScore = score;
      bestIntent = grammar.intent as IntentType;
      detectedType = grammar.transactionType;
    }
  }

  // Fallback defaults for financial numbers without explicit verbs
  if (amount !== undefined && maxScore < 0.60) {
    if (/\b(?:received|earned|salary|freelance|gig|income|from|client)\b/i.test(lower)) {
      bestIntent = 'log_income';
      detectedType = 'credit';
      maxScore = 0.85;
    } else {
      bestIntent = 'log_expense';
      detectedType = 'debit';
      maxScore = 0.85;
    }
  }

  // Populate Entities
  const entities: IntentEntities = {};
  if (amount !== undefined) entities.amount = amount;
  if (category) entities.category = category;
  if (date) entities.date = date;
  if (timePeriod) entities.timePeriod = timePeriod;
  if (detectedType) entities.transactionType = detectedType;
  if (goalName) entities.goalName = goalName;

  if (bestIntent === 'create_budget') {
    if (amount !== undefined) entities.budgetLimit = amount;
    if (category) entities.budgetCategory = category;
  }

  if (bestIntent === 'create_goal') {
    if (amount !== undefined) entities.goalAmount = amount;
    if (goalName) entities.goalName = goalName;
  }

  const isMutation = ['log_expense', 'log_income', 'log_savings', 'create_budget', 'create_goal'].includes(bestIntent);
  const missingFields: string[] = [];

  if (isMutation) {
    if (bestIntent === 'log_expense' || bestIntent === 'log_income' || bestIntent === 'log_savings') {
      if (amount === undefined) missingFields.push('amount');
    } else if (bestIntent === 'create_budget') {
      if (!entities.budgetCategory) missingFields.push('budgetCategory');
      if (entities.budgetLimit === undefined) missingFields.push('budgetLimit');
    } else if (bestIntent === 'create_goal') {
      if (!entities.goalName) missingFields.push('goalName');
      if (entities.goalAmount === undefined) missingFields.push('goalAmount');
    }
  }

  return {
    type: bestIntent,
    confidence: Math.min(Math.max(maxScore, 0.5), 0.99),
    entities,
    rawText: trimmed,
    needsFollowUp: missingFields.length > 0,
    missingFields,
  };
}

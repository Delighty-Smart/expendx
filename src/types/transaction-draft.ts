/**
 * Transaction Draft & Intent Normalization Types
 * 
 * Represents a human-centric transaction draft produced by NLOS (Natural Language Operating System).
 * Enables draft reviews, merchant mapping, category confidence, and explainability.
 */

export type CategoryStatus = 'confirmed' | 'suggested' | 'unknown';

export interface CategoryMetadata {
  name: string;
  confidence: number; // 0.0 to 1.0
  status: CategoryStatus;
  reason?: string;
  source?: 'merchant_memory' | 'concept_engine' | 'user_override' | 'fallback';
}

export interface TransactionDraft {
  id: string;
  intent: 'ADD_EXPENSE' | 'ADD_INCOME' | 'ADD_SAVINGS';
  amount: number;
  currency: string;
  type: 'debit' | 'credit' | 'savings';
  merchant?: string;
  category: CategoryMetadata;
  date: string;
  notes: string;
  fulfillment?: 'Joy' | 'Necessity' | 'Neutral' | 'Investment' | 'Waste';
  missingFields: string[];
  isConfirmed?: boolean;
  createdAt: number;
}

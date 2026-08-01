/**
 * Lucent Financial Memory Service
 * 
 * Remembers user habits, salary paydays, recurring merchants, and preferences locally.
 * Gives Lucent conversational context across chat sessions.
 */

export interface UserMemoryPattern {
  id: string;
  key: string;
  type: 'payday' | 'merchant_category' | 'preferred_time' | 'spending_habit';
  value: any;
  confidence: number;
  updatedAt: number;
}

const STORAGE_KEY = 'lucent_financial_memory';

class FinancialMemoryService {
  private memories: Map<string, UserMemoryPattern> = new Map();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed: Record<string, UserMemoryPattern> = JSON.parse(cached);
        Object.entries(parsed).forEach(([key, item]) => {
          this.memories.set(key, item);
        });
      }
    } catch (e) {
      console.warn('Failed to load financial memory', e);
    }
  }

  private save() {
    try {
      const obj: Record<string, UserMemoryPattern> = {};
      this.memories.forEach((v, k) => { obj[k] = v; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to save financial memory', e);
    }
  }

  /** Set a learned financial memory */
  remember(key: string, type: UserMemoryPattern['type'], value: any, confidence = 0.9): void {
    this.memories.set(key, {
      id: `mem-${Date.now()}`,
      key,
      type,
      value,
      confidence,
      updatedAt: Date.now(),
    });
    this.save();
  }

  /** Recall a specific memory */
  recall(key: string): any | undefined {
    return this.memories.get(key)?.value;
  }

  /** Get all memories for display or inspection */
  getAllMemories(): UserMemoryPattern[] {
    return Array.from(this.memories.values());
  }

  /** Forget a specific memory */
  forget(key: string): void {
    this.memories.delete(key);
    this.save();
  }
}

export const financialMemory = new FinancialMemoryService();

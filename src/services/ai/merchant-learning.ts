/**
 * Merchant Learning Engine & Memory System
 * 
 * Stores user categorization preferences and merchant mappings in localStorage.
 * Over time, merchant mappings take priority over default AI categorization (e.g. Shell -> Fuel, Jumia -> Electronics).
 */

const MERCHANT_MEMORY_KEY = 'lucent_merchant_memory_v1';

export interface MerchantMapping {
  merchant: string;
  category: string;
  count: number;
  lastConfirmed: number;
}

class MerchantLearningEngine {
  private mappings: Map<string, MerchantMapping> = new Map();

  constructor() {
    this.loadMemory();
  }

  private loadMemory() {
    try {
      const raw = localStorage.getItem(MERCHANT_MEMORY_KEY);
      if (raw) {
        const parsed: MerchantMapping[] = JSON.parse(raw);
        parsed.forEach(m => this.mappings.set(m.merchant.toLowerCase(), m));
      } else {
        // Seed common default merchant mappings
        this.seedDefaults();
      }
    } catch {
      this.seedDefaults();
    }
  }

  private seedDefaults() {
    const defaults: Array<[string, string]> = [
      ['shell', 'Fuel Transport'],
      ['total', 'Fuel Transport'],
      ['oando', 'Fuel Transport'],
      ['uber', 'Fuel Transport'],
      ['bolt', 'Fuel Transport'],
      ['jumia', 'Electronics and Gadgets'],
      ['amazon', 'Electronics and Gadgets'],
      ['shoprite', 'Groceries Food'],
      ['spar', 'Groceries Food'],
      ['netflix', 'Entertainment Leisure'],
      ['spotify', 'Entertainment Leisure'],
      ['chicken republic', 'Dining Out'],
      ['bukka', 'Dining Out'],
      ['mtn', 'Data and Internet'],
      ['glo', 'Data and Internet'],
      ['airtel', 'Data and Internet'],
    ];

    defaults.forEach(([merchant, category]) => {
      this.mappings.set(merchant.toLowerCase(), {
        merchant,
        category,
        count: 5,
        lastConfirmed: Date.now(),
      });
    });
  }

  private saveMemory() {
    try {
      const list = Array.from(this.mappings.values());
      localStorage.setItem(MERCHANT_MEMORY_KEY, JSON.stringify(list));
    } catch {}
  }

  /** Infer category from merchant name */
  getCategoryForMerchant(merchantName: string): { category: string; confidence: number; count: number } | null {
    if (!merchantName) return null;
    const match = this.mappings.get(merchantName.toLowerCase().trim());
    if (match) {
      const confidence = Math.min(0.99, 0.85 + Math.min(match.count * 0.03, 0.14));
      return { category: match.category, confidence, count: match.count };
    }
    return null;
  }

  /** Learn or reinforce a merchant-to-category mapping */
  learnMapping(merchantName: string, categoryName: string) {
    if (!merchantName || !categoryName) return;
    const key = merchantName.toLowerCase().trim();
    const existing = this.mappings.get(key);

    if (existing) {
      existing.category = categoryName;
      existing.count += 1;
      existing.lastConfirmed = Date.now();
    } else {
      this.mappings.set(key, {
        merchant: merchantName,
        category: categoryName,
        count: 1,
        lastConfirmed: Date.now(),
      });
    }

    this.saveMemory();
  }

  /** Extract possible merchant name from raw user text */
  extractMerchant(text: string): string | undefined {
    const lower = text.toLowerCase();
    for (const [key, mapping] of this.mappings.entries()) {
      if (lower.includes(key)) {
        return mapping.merchant;
      }
    }
    return undefined;
  }
}

export const merchantLearning = new MerchantLearningEngine();

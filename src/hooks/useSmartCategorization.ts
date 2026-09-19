import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { TransactionType } from '@/types/transactions';
import { enhancedOfflineManager } from '@/services/enhancedOfflineManager';

interface CategorySuggestion {
  category: string;
  confidence: number;
  reason: string;
}

export function useSmartCategorization(description: string, type: TransactionType) {
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!description || description.length < 3) {
      setSuggestions([]);
      return;
    }

    const getSuggestions = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Get past transactions with similar descriptions from cache / offline manager
        const allTransactions = enhancedOfflineManager.getTransactions({ type });
        const term = description.substring(0, 5).toLowerCase();

        const transactions = allTransactions.filter(t =>
          t.description?.toLowerCase().includes(term)
        ).slice(0, 20);

        if (transactions.length === 0) {
          setSuggestions([]);
          return;
        }

        // Count category occurrences
        const categoryMap = new Map<string, { count: number; examples: string[] }>();
        
        transactions.forEach(t => {
          const existing = categoryMap.get(t.category) || { count: 0, examples: [] };
          existing.count++;
          if (existing.examples.length < 2) {
            existing.examples.push(t.description);
          }
          categoryMap.set(t.category, existing);
        });

        // Convert to suggestions with confidence scores
        const newSuggestions: CategorySuggestion[] = Array.from(categoryMap.entries())
          .map(([category, data]) => ({
            category,
            confidence: Math.min(data.count / transactions.length, 1),
            reason: `Used ${data.count} times for similar transactions`
          }))
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 3);

        setSuggestions(newSuggestions);
      } catch (error) {
        console.error('Error getting category suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(getSuggestions, 500);
    return () => clearTimeout(timeoutId);
  }, [description, type]);

  return { suggestions, loading };
}

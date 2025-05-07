
import { useState, useEffect } from 'react';
import { TransactionType, getDefaultCategoriesForType, getCategoriesForType } from '@/types/transactions';

export function useCategories(type: TransactionType) {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Start with default categories to avoid empty state
        setCategories([...getDefaultCategoriesForType(type)]);
        
        // Then fetch the complete list including user categories
        const allCategories = await getCategoriesForType(type);
        setCategories(allCategories);
      } catch (err) {
        console.error('Error loading categories:', err);
        setError(err instanceof Error ? err : new Error('Failed to load categories'));
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [type]);

  return { 
    categories, 
    loading, 
    error, 
    refetch: () => {
      setLoading(true);
      getCategoriesForType(type)
        .then(cats => setCategories(cats))
        .catch(err => setError(err instanceof Error ? err : new Error('Failed to load categories')))
        .finally(() => setLoading(false));
    }
  };
}

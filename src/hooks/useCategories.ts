
import { useState, useEffect } from 'react';
import { TransactionType, getDefaultCategoriesForType, getCategoriesForType } from '@/types/transactions';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

export function useCategories(type: TransactionType) {
  const [categories, setCategories] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Use React Query for better caching and persistence
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['userCategories', type],
    queryFn: async () => {
      try {
        // Start with default categories to avoid empty state
        const defaultCats = [...getDefaultCategoriesForType(type)];
        
        // Then fetch the complete list including user categories
        const allCategories = await getCategoriesForType(type);
        
        return allCategories;
      } catch (err) {
        console.error('Error loading categories:', err);
        // Return default categories if there's an error - convert to mutable array
        return [...getDefaultCategoriesForType(type)];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (data) {
      // Ensure we have a mutable array
      setCategories([...data]);
    }
  }, [data]);

  // Listen for category changes from other components
  useEffect(() => {
    const handleCategoryUpdate = () => {
      refetch();
    };

    // Custom event listener for category updates
    window.addEventListener('categoriesUpdated', handleCategoryUpdate);
    
    return () => {
      window.removeEventListener('categoriesUpdated', handleCategoryUpdate);
    };
  }, [refetch]);

  const refreshCategories = async () => {
    try {
      const refreshedCategories = await getCategoriesForType(type);
      setCategories([...refreshedCategories]); // Convert to mutable array
      // Invalidate any related queries
      queryClient.invalidateQueries({ queryKey: ['userCategories'] });
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('categoriesUpdated'));
    } catch (err) {
      console.error('Error refreshing categories:', err);
    }
  };

  return { 
    categories, 
    loading: isLoading, 
    error: error as Error | null,
    refetch: refreshCategories
  };
}

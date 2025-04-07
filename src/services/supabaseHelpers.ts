
/**
 * Helper function to safely type-cast Supabase query results to the expected type
 * This function helps bridge the gap between Supabase's generated types and our application types
 */
import { PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js';
import { asId, DbInsert, DbRow, DbUpdate } from './typeHelpers';
import { Database } from '@/integrations/supabase/types';

export function safelyUnwrapResponse<T>(
  response: any,  // Using any here to accommodate various Supabase response types
  defaultValue: T
): T {
  if (!response) return defaultValue;
  
  // Check if we're dealing with an error response
  if (response.error || 
      (typeof response === 'object' && 'error' in response)) {
    console.error("Error in Supabase response:", response.error || response);
    return defaultValue;
  }
  
  // For array responses, check if it's properly formed
  if (Array.isArray(response)) {
    return response as unknown as T;
  }
  
  // For single object responses
  if (typeof response === 'object' && !Array.isArray(response)) {
    return response as unknown as T;
  }
  
  return defaultValue;
}

/**
 * Safely accesses properties from potentially error responses
 * @param obj - The object to access property from (could be an error)
 * @param key - The property key to access
 * @param defaultValue - Default value if property doesn't exist
 */
export function safePropertyAccess<T>(
  obj: any,
  key: string,
  defaultValue: T
): T {
  if (!obj || typeof obj !== 'object' || obj.error) {
    return defaultValue;
  }
  
  return (obj[key] as T) ?? defaultValue;
}

/**
 * Type guard to check if a response has an error
 */
export function hasError(response: any): boolean {
  return !response || 
    response.error || 
    (typeof response === 'object' && 'error' in response);
}

/**
 * Safely casts database ID types for use with Supabase queries
 */
export function asUUID(id: string): string {
  return id;
}

/**
 * Type-safe helper for handling Supabase insert operations
 */
export function prepareInsert<T extends keyof Database['public']['Tables']>(
  table: T, 
  data: Partial<DbRow<T>>
): DbInsert<T> {
  return data as unknown as DbInsert<T>;
}

/**
 * Type-safe helper for handling Supabase update operations
 */
export function prepareUpdate<T extends keyof Database['public']['Tables']>(
  table: T, 
  data: Partial<DbRow<T>>
): DbUpdate<T> {
  return data as unknown as DbUpdate<T>;
}

/**
 * Type-safe UUID conversion for table IDs
 */
export function makeId<T extends keyof Database['public']['Tables']>(
  table: T, 
  id: string
): string {
  return id;
}

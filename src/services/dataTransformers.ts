
import { Database } from '@/integrations/supabase/types';

/**
 * This file contains utility functions for transforming raw data from Supabase
 * into the shape expected by our application components.
 */

/**
 * Helper function to safely type-cast Supabase query responses
 */
export function castSupabaseResponse<T>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data as unknown as T[];
  }
  // Handle SelectQueryError and other non-array responses
  return [];
}

/**
 * Helper function to handle single item responses
 */
export function castSupabaseSingleResponse<T>(data: any, defaultValue: T): T {
  if (!data) return defaultValue;
  if (typeof data === 'object' && !Array.isArray(data) && !data.error) {
    return data as unknown as T;
  }
  return defaultValue;
}

/**
 * Helper function to convert query strings to PostgreSQL compatible format
 */
export function formatQueryParam(param: string | string[]): any {
  if (Array.isArray(param)) {
    return param;
  }
  return param;
}

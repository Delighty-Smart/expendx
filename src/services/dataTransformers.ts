
import { Database } from '@/integrations/supabase/types';
import { PostgrestSingleResponse } from '@supabase/supabase-js';

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

/**
 * Type-safe helper to convert a PostgrestSingleResponse to the expected type
 * Handles errors and optional data consistently
 */
export function unwrapSingleResponse<T>(
  response: PostgrestSingleResponse<any>, 
  defaultValue: T
): T {
  if (response.error) {
    console.error("Supabase query error:", response.error);
    return defaultValue;
  }
  
  if (!response.data) {
    return defaultValue;
  }
  
  return response.data as unknown as T;
}

/**
 * Type-safe helper to convert a PostgrestResponse to the expected array type
 * Handles errors and optional data consistently
 */
export function unwrapArrayResponse<T>(
  response: any, 
  defaultValue: T[] = []
): T[] {
  if (response.error) {
    console.error("Supabase query error:", response.error);
    return defaultValue;
  }
  
  if (!response.data) {
    return defaultValue;
  }
  
  if (Array.isArray(response.data)) {
    return response.data as unknown as T[];
  }
  
  return defaultValue;
}

/**
 * Type converter that helps bridge Supabase types to application types
 */
export function convertTo<T>(data: any): T {
  return data as unknown as T;
}

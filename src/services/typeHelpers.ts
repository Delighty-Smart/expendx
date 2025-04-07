
/**
 * This file contains type helper functions that safely cast and convert types
 * between the application domain types and the Supabase database types
 */

import { Database } from '@/integrations/supabase/types';

/**
 * Generic type casting helper for IDs
 * Helps fix TypeScript errors when dealing with database UUIDs
 */
export function asId<T>(id: string): T {
  return id as unknown as T;
}

/**
 * Type-safe helper for Supabase ID fields
 * Used when passing IDs to Supabase queries
 */
export function asDbId(id: string): string {
  return id;
}

/**
 * Generic type casting helper for filter fields
 */
export function asFilterField<T>(field: any): T {
  return field as unknown as T;
}

/**
 * Convert generic response data to specific model type
 */
export function asModel<T>(data: any): T {
  if (!data || data.error) {
    console.error("Error converting to model:", data?.error || "No data");
    throw new Error("Failed to convert data to model");
  }
  return data as unknown as T;
}

/**
 * Convert generic response data to array of specific model type
 */
export function asModelArray<T>(data: any): T[] {
  if (!data) return [];
  if (data.error) {
    console.error("Error converting to model array:", data.error);
    return [];
  }
  if (!Array.isArray(data)) {
    return [data] as unknown as T[];
  }
  return data as unknown as T[];
}

/**
 * Extract value from possibly errored response
 */
export function extractValue<T>(data: any, key: string, defaultValue: T): T {
  if (!data || data.error || typeof data !== 'object') {
    return defaultValue;
  }
  return (data[key] as T) ?? defaultValue;
}

/**
 * Check if response has error
 */
export function isError(response: any): boolean {
  return !response || response.error;
}

/**
 * Type-safe wrapper for Supabase table operations
 * Used to safely convert Supabase table types to app types
 */
export type DbTable<TableName extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][TableName];

export type DbRow<TableName extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][TableName]['Row'];

export type DbInsert<TableName extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][TableName]['Insert'];

export type DbUpdate<TableName extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][TableName]['Update'];

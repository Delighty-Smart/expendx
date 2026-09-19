
/**
 * Utility functions for transforming raw data
 */

export function castSupabaseResponse<T>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data as unknown as T[];
  }
  return [];
}

export function castSupabaseSingleResponse<T>(data: any, defaultValue: T): T {
  if (!data) return defaultValue;
  if (typeof data === 'object' && !Array.isArray(data) && !data.error) {
    return data as unknown as T;
  }
  return defaultValue;
}

export function formatQueryParam(param: string | string[]): any {
  if (Array.isArray(param)) {
    return param;
  }
  return param;
}

export function unwrapSingleResponse<T>(
  response: any, 
  defaultValue: T
): T {
  if (!response || response.error) {
    if (response?.error) console.error("Query error:", response.error);
    return defaultValue;
  }
  
  const data = response.data !== undefined ? response.data : response;
  if (!data) return defaultValue;
  
  return data as unknown as T;
}

export function unwrapArrayResponse<T>(
  response: any, 
  defaultValue: T[] = []
): T[] {
  if (!response || response.error) {
    if (response?.error) console.error("Query error:", response.error);
    return defaultValue;
  }
  
  const data = response.data !== undefined ? response.data : response;
  if (!data) return defaultValue;
  
  if (Array.isArray(data)) {
    return data as unknown as T[];
  }
  
  return defaultValue;
}

export function convertTo<T>(data: any): T {
  return data as unknown as T;
}

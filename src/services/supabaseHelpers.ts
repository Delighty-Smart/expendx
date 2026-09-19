
/**
 * Helper functions to safely unwrap responses and manage UUIDs
 */

export function safelyUnwrapResponse<T>(
  response: any,
  defaultValue: T
): T {
  if (!response) return defaultValue;
  
  if (response.error || (typeof response === 'object' && 'error' in response)) {
    console.error("Error in response:", response.error || response);
    return defaultValue;
  }
  
  if (Array.isArray(response)) {
    return response as unknown as T;
  }
  
  if (typeof response === 'object' && !Array.isArray(response)) {
    return response as unknown as T;
  }
  
  return defaultValue;
}

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

export function hasError(response: any): boolean {
  return !response || 
    response.error || 
    (typeof response === 'object' && 'error' in response);
}

export function asUUID(id: string): string {
  return id;
}

export function makeId(table: string, id: string): string {
  return id;
}

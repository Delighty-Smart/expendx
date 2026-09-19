
/**
 * This file contains generic type helper functions for safe data casting
 */

export function asId<T>(id: string): T {
  return id as unknown as T;
}

export function asDbId(id: string): string {
  return id;
}

export function asFilterField<T>(field: any): T {
  return field as unknown as T;
}

export function asModel<T>(data: any): T {
  if (!data || data.error) {
    console.error("Error converting to model:", data?.error || "No data");
    throw new Error("Failed to convert data to model");
  }
  return data as unknown as T;
}

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

export function extractValue<T>(data: any, key: string, defaultValue: T): T {
  if (!data || data.error || typeof data !== 'object') {
    return defaultValue;
  }
  return (data[key] as T) ?? defaultValue;
}

export function isError(response: any): boolean {
  return !response || response.error;
}

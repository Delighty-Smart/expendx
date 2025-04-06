
/**
 * Helper function to safely type-cast Supabase query results to the expected type
 * This function helps bridge the gap between Supabase's generated types and our application types
 */
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

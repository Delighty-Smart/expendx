
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useRefresh = () => {
  // Always call useQueryClient hook unconditionally
  const queryClient = useQueryClient();

  const refreshData = useCallback(async () => {
    try {
      // Check if queryClient exists and has the invalidateQueries method
      if (!queryClient || typeof queryClient.invalidateQueries !== 'function') {
        console.warn("QueryClient not properly initialized, falling back to page reload");
        toast("Page refreshed");
        window.location.reload();
        return;
      }

      // Invalidate all queries to trigger fresh data fetch
      await queryClient.invalidateQueries();
      
      toast("Data has been updated successfully");
    } catch (error) {
      console.error("Refresh failed:", error);
      toast("Could not update data. Please try again.");
      throw error;
    }
  }, [queryClient]);

  return { refreshData };
};

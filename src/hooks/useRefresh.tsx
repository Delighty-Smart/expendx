
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export const useRefresh = () => {
  const { toast } = useToast();
  
  // Always call useQueryClient hook unconditionally
  const queryClient = useQueryClient();

  const refreshData = useCallback(async () => {
    try {
      // Check if queryClient exists and has the invalidateQueries method
      if (!queryClient || typeof queryClient.invalidateQueries !== 'function') {
        console.warn("QueryClient not properly initialized, falling back to page reload");
        toast({
          title: "Refresh",
          description: "Page refreshed",
        });
        window.location.reload();
        return;
      }

      // Invalidate all queries to trigger fresh data fetch
      await queryClient.invalidateQueries();
      
      toast({
        title: "Refreshed",
        description: "Data has been updated successfully",
      });
    } catch (error) {
      console.error("Refresh failed:", error);
      toast({
        title: "Refresh Failed",
        description: "Could not update data. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [queryClient, toast]);

  return { refreshData };
};

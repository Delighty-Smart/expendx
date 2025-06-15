
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export const useRefresh = () => {
  const { toast } = useToast();
  
  // Safely get queryClient with proper error handling
  let queryClient;
  try {
    queryClient = useQueryClient();
  } catch (error) {
    console.warn("QueryClient not available, falling back to page reload");
    queryClient = null;
  }

  const refreshData = useCallback(async () => {
    try {
      // If no queryClient available, fall back to page reload
      if (!queryClient) {
        console.warn("QueryClient not available for refresh, falling back to page reload");
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

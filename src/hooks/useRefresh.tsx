
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export const useRefresh = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refreshData = useCallback(async () => {
    try {
      // Check if queryClient is available
      if (!queryClient) {
        console.warn("QueryClient not available for refresh");
        toast({
          title: "Refresh Failed",
          description: "Query client not available. Please try again.",
          variant: "destructive"
        });
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

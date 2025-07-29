import { useCallback } from "react";
import { toast } from "sonner";

export const useRefresh = () => {
  const refreshData = useCallback(async () => {
    try {
      // Simple page reload approach that always works
      toast("Refreshing data...");
      window.location.reload();
    } catch (error) {
      console.error("Refresh failed:", error);
      toast("Could not update data. Please try again.");
      throw error;
    }
  }, []);

  return { refreshData };
};
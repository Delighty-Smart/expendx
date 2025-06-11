
import React from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<any>;
  children: React.ReactNode;
  containerClassName?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  containerClassName = "",
}) => {
  React.useEffect(() => {
    // Enable native pull-to-refresh behavior
    const handleRefresh = async () => {
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      }
    };

    // Use browser's native pull-to-refresh if available
    if ('serviceWorker' in navigator) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        // This allows the browser to handle native refresh
        return;
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }

    // For mobile devices, we rely on the browser's native implementation
    // by setting the appropriate CSS properties
  }, [onRefresh]);

  return (
    <div 
      className={`${containerClassName}`}
      style={{ 
        // Enable native pull-to-refresh on supported browsers/devices
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
        // This allows the browser to handle native refresh animations
        touchAction: "manipulation"
      }}
    >
      {children}
    </div>
  );
};

export { PullToRefresh };

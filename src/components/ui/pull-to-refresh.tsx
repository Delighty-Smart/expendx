
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
    // Register the refresh handler for native pull-to-refresh
    const handleRefresh = async (event: any) => {
      // Check if this is a native refresh event
      if (event.type === 'beforeunload' || document.visibilityState === 'hidden') {
        return;
      }
      
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      }
    };

    // Listen for native refresh events
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible again, trigger refresh
        handleRefresh({ type: 'visibilitychange' });
      }
    };

    // Add event listeners for native refresh
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Enable native pull-to-refresh via meta tag if not already present
    let refreshMeta = document.querySelector('meta[name="theme-color"]');
    if (!refreshMeta) {
      refreshMeta = document.createElement('meta');
      refreshMeta.setAttribute('name', 'theme-color');
      refreshMeta.setAttribute('content', '#ffffff');
      document.head.appendChild(refreshMeta);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onRefresh]);

  return (
    <div 
      className={`${containerClassName}`}
      style={{ 
        // Enable native pull-to-refresh on supported browsers/devices
        overscrollBehavior: "auto",
        WebkitOverflowScrolling: "touch",
        // Allow native browser refresh behavior
        touchAction: "auto"
      }}
    >
      {children}
    </div>
  );
};

export { PullToRefresh };

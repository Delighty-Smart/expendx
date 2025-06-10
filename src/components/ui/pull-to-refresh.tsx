
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
  // Use native browser/device pull-to-refresh functionality
  React.useEffect(() => {
    const handleRefresh = async (event: Event) => {
      event.preventDefault();
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      }
    };

    // Add refresh event listener for native pull-to-refresh
    window.addEventListener('beforeunload', handleRefresh);
    
    return () => {
      window.removeEventListener('beforeunload', handleRefresh);
    };
  }, [onRefresh]);

  return (
    <div 
      className={`${containerClassName}`}
      style={{ 
        overscrollBehavior: "auto",
        WebkitOverflowScrolling: "touch"
      }}
    >
      {children}
    </div>
  );
};

export { PullToRefresh };

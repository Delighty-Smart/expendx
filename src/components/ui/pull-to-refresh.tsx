
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
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  React.useEffect(() => {
    let startY = 0;
    let currentY = 0;
    let isAtTop = true;
    let pullDistance = 0;
    const threshold = 80; // Minimum pull distance to trigger refresh

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      // Check if we're at the top of the page
      isAtTop = window.scrollY === 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop || isRefreshing) return;
      
      currentY = e.touches[0].clientY;
      pullDistance = currentY - startY;

      // Only prevent default if we're pulling down from the top
      if (pullDistance > 0 && window.scrollY === 0) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (!isAtTop || isRefreshing || pullDistance < threshold) {
        pullDistance = 0;
        return;
      }

      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      } finally {
        setIsRefreshing(false);
        pullDistance = 0;
      }
    };

    const handleScroll = () => {
      isAtTop = window.scrollY === 0;
    };

    // Add event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [onRefresh, isRefreshing]);

  return (
    <div 
      className={`${containerClassName}`}
      style={{ 
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
        position: "relative"
      }}
    >
      {children}
    </div>
  );
};

export { PullToRefresh };

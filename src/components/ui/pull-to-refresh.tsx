
import React, { useState, useEffect, useRef } from "react";
import { RefreshCcw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<any>;
  children: React.ReactNode;
  pullDownThreshold?: number;
  containerClassName?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  pullDownThreshold = 80,
  containerClassName = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const touchingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only enable pull-to-refresh when scrolled to top
      if (container.scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY;
        touchingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchingRef.current) return;
      
      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY.current;
      
      // Only allow pulling down, not up, and only when at top of the container
      if (distance > 0 && container.scrollTop <= 0) {
        // Apply resistance to make the pull feel natural
        const dampedDistance = Math.min(distance * 0.4, pullDownThreshold * 1.5);
        setPullDistance(dampedDistance);
        setIsPulling(true);
        
        // Prevent default scrolling behavior when pulling
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (!touchingRef.current) return;
      
      touchingRef.current = false;
      
      if (pullDistance >= pullDownThreshold && !isRefreshing) {
        setIsRefreshing(true);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error("Refresh failed:", error);
        }
        
        setIsRefreshing(false);
      }
      
      setPullDistance(0);
      setIsPulling(false);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onRefresh, pullDownThreshold, isRefreshing, pullDistance]);

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-y-auto ${containerClassName}`}
      style={{ 
        height: "100%", 
        scrollBehavior: "smooth",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain"
      }}
    >
      {/* Pull down indicator */}
      {isPulling && (
        <div 
          className="flex items-center justify-center w-full absolute top-0 z-10 pointer-events-none" 
          style={{ 
            height: `${pullDistance}px`, 
            transition: isRefreshing ? "none" : "height 0.2s ease"
          }}
        >
          <div 
            className="text-primary flex items-center justify-center gap-2"
            style={{ 
              transform: isRefreshing ? "none" : `rotate(${Math.min(pullDistance / pullDownThreshold * 360, 180)}deg)`,
              opacity: pullDistance / pullDownThreshold
            }}
          >
            <RefreshCcw 
              className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} 
            />
            <span className="text-sm font-medium">
              {isRefreshing ? "Refreshing..." : pullDistance >= pullDownThreshold ? "Release to refresh" : "Pull to refresh"}
            </span>
          </div>
        </div>
      )}

      {/* Create a spacer when pulling */}
      {isPulling && (
        <div style={{ height: `${pullDistance}px` }} className="min-h-0"></div>
      )}

      {children}
    </div>
  );
};

export { PullToRefresh };

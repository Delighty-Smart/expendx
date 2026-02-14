<<<<<<< HEAD
import React, { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
=======

import React from "react";
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315

interface PullToRefreshProps {
  onRefresh: () => Promise<any>;
  children: React.ReactNode;
  containerClassName?: string;
}

<<<<<<< HEAD
export const PullToRefresh: React.FC<PullToRefreshProps> = ({
=======
const PullToRefresh: React.FC<PullToRefreshProps> = ({
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315
  onRefresh,
  children,
  containerClassName = "",
}) => {
<<<<<<< HEAD
  const [startY, setStartY] = useState(0);
  const [pullPixels, setPullPixels] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track if the current touch gesture is a valid pull-to-refresh attempt
  const activeTouchRef = useRef<{ startY: number; isValid: boolean }>({ startY: 0, isValid: false });

  const THRESHOLD = 80;
  const MAX_PULL = 160;

  // Helper to check if any ancestor is scrolled down
  const isScrolled = (element: HTMLElement | null): boolean => {
    if (!element || element === document.body) return false;

    // Check if element is scrollable and scrolled down
    const style = window.getComputedStyle(element);
    const isScrollable = style.overflowY === 'auto' || style.overflowY === 'scroll';

    if (isScrollable && element.scrollTop > 0) return true;

    return isScrolled(element.parentElement);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Reset status
    activeTouchRef.current = { startY: 0, isValid: false };

    // Only enable pull to refresh when at the top of the page
    if (window.scrollY > 5) return;

    // Also check if we're inside a scrollable container that isn't at the top
    if (isScrolled(e.target as HTMLElement)) return;

    // Valid pull start
    const y = e.touches[0].clientY;
    setStartY(y);
    activeTouchRef.current = { startY: y, isValid: true };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // If this gesture was marked invalid at start, ignore it completely
    if (!activeTouchRef.current.isValid) return;

    if (window.scrollY > 5 || refreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - activeTouchRef.current.startY;

    // Only handle pull down if we have a valid positive diff
    if (diff > 0) {
      // If we are pulling, prevent default isn't needed with overscroll-behavior-y: none

      // Calculate pull with resistance (logarithmic-like)
      const pull = Math.min(diff * 0.4, MAX_PULL);
      setPullPixels(pull);
    }
  };

  const handleTouchEnd = async () => {
    if (refreshing) return;

    if (pullPixels > THRESHOLD) {
      setRefreshing(true);
      setPullPixels(THRESHOLD); // Snap to threshold

      try {
        // Haptic feedback if available (using Web Vibration API)
        if (navigator.vibrate) navigator.vibrate(50);

        await onRefresh();
      } catch (error) {
        console.error("Refresh failed", error);
      } finally {
        // Delay slightly to show completion
        setTimeout(() => {
          setRefreshing(false);
          setPullPixels(0);
        }, 300);
      }
    } else {
      // Snap back if threshold not met
      setPullPixels(0);
    }
    setStartY(0);
  };

  return (
    <div
      ref={containerRef}
      className={containerClassName}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        // Disable native browser refresh behavior
        overscrollBehaviorY: "none",
        // Allow vertical scrolling
        touchAction: "pan-y",
        position: "relative",
        minHeight: "100%"
      }}
    >
      {/* Loading Indicator Container */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${pullPixels}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        <div
          className="bg-card rounded-full p-2 shadow-md border border-border"
          style={{
            transform: `translateY(${Math.min(pullPixels - 50, 10)}px)`,
            opacity: Math.min(pullPixels / (THRESHOLD * 0.8), 1),
            transition: refreshing ? 'transform 0.2s' : 'none'
          }}
        >
          <Loader2
            className={`h-5 w-5 text-primary ${refreshing ? 'animate-spin' : ''}`}
            style={{
              transform: `rotate(${pullPixels * 2}deg)`
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullPixels}px)`,
          transition: (pullPixels === 0 || refreshing) ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};
=======
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
>>>>>>> d5c355c5198d435bc3f48173568d7a0262962315

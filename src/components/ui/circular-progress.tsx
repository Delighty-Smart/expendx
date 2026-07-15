import React from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  size?: number; // width and height in px
  strokeWidth?: number;
  ringColor?: string; // tailwind text class like "text-primary" or "text-emerald-500"
  trackColor?: string; // tailwind text class like "text-muted/20"
  glow?: boolean;
}

export function CircularProgress({
  value,
  size = 64,
  strokeWidth = 6,
  ringColor = "text-primary",
  trackColor = "text-muted/20",
  glow = false,
  className,
  children,
  ...props
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;

  return (
    <div
      className={cn("relative flex items-center justify-center select-none flex-shrink-0", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        className="transform -rotate-90 w-full h-full"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track circle */}
        <circle
          className={cn("transition-colors duration-300", trackColor)}
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Active progress circle */}
        <circle
          className={cn("transition-all duration-500 ease-out origin-center", ringColor)}
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            filter: glow ? `drop-shadow(0 0 3px currentColor)` : undefined,
          }}
        />
      </svg>
      {/* Centered content */}
      {children && (
        <div className="absolute flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

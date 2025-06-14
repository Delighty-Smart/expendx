
import { Flame, Zap } from "lucide-react";
import { getStreakText, getStreakStatus } from "@/lib/streak";
import { cn } from "@/lib/utils";

interface StreakDisplayProps {
  streak: {
    current_streak: number;
    highest_streak: number;
    current_title: string;
    last_login: string;
    freeze_count: number;
  };
  onClick: () => void;
}

const StreakDisplay = ({ streak, onClick }: StreakDisplayProps) => {
  const status = getStreakStatus(streak);
  
  return (
    <div 
      className="relative group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
      onClick={onClick}
    >
      {/* Glassmorphism Card */}
      <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/5 dark:bg-black/20 border border-white/10 dark:border-white/5 shadow-2xl">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10" />
        
        {/* Animated Border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-md opacity-50 animate-pulse" />
                <div className="relative p-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 shadow-lg">
                  <Flame className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Current Streak
                </h3>
              </div>
            </div>
            
            {/* Status Indicator */}
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              status.status === 'active' && "bg-green-500/20 text-green-400",
              status.status === 'at_risk' && "bg-yellow-500/20 text-yellow-400",
              status.status === 'broken' && "bg-red-500/20 text-red-400"
            )}>
              {status.status === 'active' && '🔥 Active'}
              {status.status === 'at_risk' && '⚠️ At Risk'}
              {status.status === 'broken' && '💔 Broken'}
            </div>
          </div>

          {/* Main Streak Display */}
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              {streak.current_streak}
            </span>
            <span className="text-lg text-muted-foreground">
              {streak.current_streak === 1 ? "day" : "days"}
            </span>
          </div>

          {/* Status Message */}
          <p className="text-sm text-muted-foreground mb-4">
            {status.message}
          </p>

          {/* Bottom Stats */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20">
                <Zap className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Current Title</span>
                <p className="text-sm font-medium">{streak.current_title}</p>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Best Streak</span>
              <p className="text-sm font-bold text-amber-500">{streak.highest_streak} days</p>
            </div>
          </div>

          {/* Freeze Count */}
          {streak.freeze_count > 0 && (
            <div className="mt-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-blue-400">
                  {streak.freeze_count} streak {streak.freeze_count === 1 ? 'freeze' : 'freezes'} available
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreakDisplay;


import React from "react";
import { Flame, Check, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStreakText, STREAK_MILESTONES } from "@/lib/streak";
import { cn } from "@/lib/utils";

interface StreakModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streak: {
    current_streak: number;
    highest_streak: number;
    current_title: string;
    last_login: string;
  } | null;
}

const StreakModal = ({ open, onOpenChange, streak }: StreakModalProps) => {
  if (!streak) return null;

  // Create an array of days representing the current week
  const currentDate = new Date();
  const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  
  // Find the current milestone and the next milestone
  const currentMilestoneIndex = STREAK_MILESTONES.findIndex(
    m => m.title === streak.current_title
  );
  
  const nextMilestone = STREAK_MILESTONES[currentMilestoneIndex + 1];
  const daysToNextMilestone = nextMilestone 
    ? nextMilestone.days - streak.current_streak 
    : null;

  // Generate a motivational message based on streak
  const getMessage = () => {
    if (streak.current_streak === 1) {
      return "Great start! Keep up the momentum!";
    } else if (streak.current_streak < 7) {
      return "You're on fire! 🔥 Time to keep building your streak!";
    } else if (streak.current_streak < 30) {
      return "Impressive dedication! You're building a solid financial habit!";
    } else {
      return "Amazing commitment! You're on the path to financial mastery!";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-background to-background/80 backdrop-blur border border-primary/20">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold flex flex-col items-center gap-2">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-2">
              <Flame className="w-12 h-12 text-white animate-pulse" />
            </div>
            <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
              {streak.current_streak}
            </span>
            <span className="text-muted-foreground font-normal text-sm">
              {getStreakText(streak.current_streak)}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex justify-center mb-4">
          <div className="bg-black/30 p-2 rounded-xl grid grid-cols-7 gap-1 w-full max-w-xs">
            {days.map((day, index) => {
              // Calculate if this day has been checked off
              // For simplicity, we'll mark days before today as checked
              const isChecked = index < dayOfWeek;
              const isToday = index === dayOfWeek;
              
              return (
                <div 
                  key={index} 
                  className={cn(
                    "flex flex-col items-center justify-center aspect-square rounded-lg",
                    isChecked ? "bg-green-500/20" : "bg-gray-700/20",
                    isToday && "ring-2 ring-primary"
                  )}
                >
                  <span className="text-xs text-muted-foreground">{day}</span>
                  {isChecked ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="bg-black/30 p-4 rounded-xl text-center mb-4">
          <p className="text-sm">
            {getMessage()}
          </p>
          
          {daysToNextMilestone && (
            <p className="text-xs text-muted-foreground mt-2">
              {daysToNextMilestone} more {daysToNextMilestone === 1 ? 'day' : 'days'} until you reach 
              <span className="font-semibold text-primary"> {nextMilestone.title}</span>
            </p>
          )}
        </div>
        
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Current Title: {streak.current_title}</span>
          </div>
          <div>Best Streak: {streak.highest_streak} days</div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StreakModal;


import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, Award, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STREAK_MILESTONES } from "@/lib/streak";
import { Badge } from "@/components/ui/badge";

interface StreakProgressProps {
  streak: any;
}

const StreakProgress = ({ streak }: StreakProgressProps) => {
  const [progress, setProgress] = useState(0);
  
  // Find current milestone and next milestone
  const currentMilestoneIndex = STREAK_MILESTONES.findIndex(m => m.title === streak.current_title);
  const currentMilestone = STREAK_MILESTONES[currentMilestoneIndex];
  const nextMilestone = STREAK_MILESTONES[currentMilestoneIndex + 1];
  
  // Calculate progress percentage to next milestone
  useEffect(() => {
    if (!currentMilestone || !nextMilestone) {
      setProgress(100);
      return;
    }
    
    const currentDays = currentMilestone.days;
    const nextDays = nextMilestone.days;
    const daysRange = nextDays - currentDays;
    const daysProgress = streak.current_streak - currentDays;
    const progressPercentage = Math.min(100, Math.floor((daysProgress / daysRange) * 100));
    
    // Animate progress bar
    const timer = setTimeout(() => {
      setProgress(progressPercentage);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [streak, currentMilestone, nextMilestone]);
  
  if (!streak) return null;

  return (
    <Card className="border-primary/20 shadow-lg hover:shadow-primary/10 transition-all duration-300 overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full opacity-50" />
      
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Flame className="h-5 w-5 text-pink-500" />
          <span>Your Streak Journey</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center p-4 bg-primary/5 rounded-lg border border-primary/10 hover:bg-primary/10 transition-all duration-300">
            <div className="text-3xl font-bold text-primary mb-1 flex items-center gap-1">
              <Flame className="h-6 w-6 text-pink-500 animate-pulse" /> 
              {streak.current_streak}
            </div>
            <div className="text-sm text-muted-foreground">Current Streak</div>
          </div>
          
          <div className="flex flex-col items-center justify-center p-4 bg-primary/5 rounded-lg border border-primary/10 hover:bg-primary/10 transition-all duration-300">
            <div className="text-3xl font-bold text-primary mb-1 flex items-center gap-1">
              <Trophy className="h-6 w-6 text-amber-500" /> 
              {streak.highest_streak}
            </div>
            <div className="text-sm text-muted-foreground">Highest Streak</div>
          </div>
          
          <div className="flex flex-col items-center justify-center p-4 bg-primary/5 rounded-lg border border-primary/10 hover:bg-primary/10 transition-all duration-300">
            <div className="text-3xl font-bold text-primary mb-1 flex items-center gap-1">
              <Award className="h-6 w-6 text-purple-500" /> 
              {streak.freeze_count}
            </div>
            <div className="text-sm text-muted-foreground">Freeze Days Left</div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <span className="font-medium">Current Title:</span>
            </div>
            <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
              {streak.current_title}
            </Badge>
          </div>
          
          {nextMilestone && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {streak.current_streak} days
                </span>
                <span className="text-muted-foreground">
                  {nextMilestone.days} days (Next: {nextMilestone.title})
                </span>
              </div>
              <Progress 
                value={progress} 
                className="h-2 animate-glow" 
              />
              <p className="text-sm text-muted-foreground text-center">
                {nextMilestone.days - streak.current_streak} more days to reach next title
              </p>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
          {STREAK_MILESTONES.map((milestone, index) => {
            const isUnlocked = streak.current_streak >= milestone.days;
            const isCurrent = milestone.title === streak.current_title;
            
            return (
              <div 
                key={milestone.title}
                className={`p-2 rounded-md text-center border ${
                  isCurrent 
                    ? 'border-primary bg-primary/10 animate-glow' 
                    : isUnlocked 
                      ? 'border-green-500/30 bg-green-500/5' 
                      : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <div className="font-medium mb-1">{milestone.title}</div>
                <div className={`text-xs ${isUnlocked ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {milestone.days} days
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default StreakProgress;

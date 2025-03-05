
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, Calendar, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const StreakProgress = ({ streak }: { streak: any }) => {
  // Calculate progress to next title
  const streakMilestones = [
    { threshold: 1, title: "Budget Beginner" },
    { threshold: 5, title: "Finance Explorer" },
    { threshold: 10, title: "Money Master" },
    { threshold: 15, title: "Savings Sensation" },
    { threshold: 30, title: "Finance Virtuoso" },
    { threshold: 60, title: "Budget Legend" },
    { threshold: 100, title: "Finance Guru" },
    { threshold: 180, title: "Money Maestro" },
    { threshold: 365, title: "Financial Wizard" },
  ];
  
  const currentIndex = streakMilestones.findIndex(
    milestone => milestone.title === streak.current_title
  );
  
  const nextMilestone = streakMilestones[currentIndex + 1];
  const currentMilestone = streakMilestones[currentIndex];
  
  const progress = nextMilestone 
    ? Math.min(100, Math.round((streak.current_streak - currentMilestone.threshold) / 
      (nextMilestone.threshold - currentMilestone.threshold) * 100))
    : 100;
  
  const nextTitle = nextMilestone ? nextMilestone.title : "Ultimate Master";
  const daysToNext = nextMilestone ? nextMilestone.threshold - streak.current_streak : 0;

  // Create an array of days representing the current week
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
  // Convert to our days array index (where Monday is 0)
  const todayIndex = today === 0 ? 6 : today - 1;

  return (
    <Card className="overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-pink-500" />
          Your Streak Journey
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left section - Streak icon and count */}
          <div className="bg-black/80 rounded-xl p-4 flex flex-col items-center justify-center">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-4 rounded-xl mb-2 animate-pulse">
              <Flame className="h-12 w-12 text-white" />
            </div>
            <span className="text-3xl font-bold">{streak.current_streak} days</span>
            <span className="text-sm text-muted-foreground">Current Streak</span>
          </div>
          
          {/* Middle section - Progress bar and points */}
          <div className="md:col-span-2 bg-black/60 rounded-xl p-4 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-semibold">{streak.current_streak}</span>
              <span className="text-muted-foreground">/ {nextMilestone ? nextMilestone.threshold : streak.current_streak}</span>
            </div>
            <Progress value={progress} className="h-2 mb-4" />
            
            {/* Weekly progress indicators */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                // Mark days before today as checked, today as active
                const isChecked = index < todayIndex;
                const isToday = index === todayIndex;
                
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div 
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center mb-1",
                        isChecked ? "bg-green-500/20" : "bg-gray-500/20",
                        isToday && "ring-2 ring-primary"
                      )}
                    >
                      {isChecked ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : null}
                    </div>
                    <span className="text-xs">{day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center px-4 py-3 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-1">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="text-xl font-bold">{streak.highest_streak}</span>
            </div>
            <p className="text-xs text-muted-foreground">Highest Streak</p>
          </div>
          
          <div className="flex flex-col items-center justify-center px-4 py-3 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-1">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="text-xl font-bold">{streak.freeze_count}</span>
            </div>
            <p className="text-xs text-muted-foreground">Streak Freezes</p>
          </div>
          
          <div className="flex flex-col items-center justify-center px-4 py-3 bg-primary/10 rounded-lg">
            <div className="text-xl font-bold truncate max-w-full">
              {streak.current_title}
            </div>
            <p className="text-xs text-muted-foreground">Current Title</p>
          </div>
        </div>
        
        {nextMilestone && (
          <div className="space-y-1 bg-black/40 p-3 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Progress to {nextTitle}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {daysToNext} days to reach next level
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StreakProgress;

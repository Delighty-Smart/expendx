
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, Calendar } from "lucide-react";

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-pink-500" />
            Your Streak Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Title</p>
                <p className="text-2xl font-bold">{streak.current_title}</p>
              </div>
              
              <div className="flex flex-col items-center justify-center px-4 py-2 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-1">
                  <Flame className="h-5 w-5 text-pink-500" />
                  <span className="text-2xl font-bold">{streak.current_streak}</span>
                </div>
                <p className="text-xs text-muted-foreground">Current Streak</p>
              </div>
              
              <div className="flex flex-col items-center justify-center px-4 py-2 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-1">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">{streak.highest_streak}</span>
                </div>
                <p className="text-xs text-muted-foreground">Highest Streak</p>
              </div>
              
              <div className="flex flex-col items-center justify-center px-4 py-2 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-1">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">{streak.freeze_count}</span>
                </div>
                <p className="text-xs text-muted-foreground">Streak Freezes</p>
              </div>
            </div>
            
            {nextMilestone && (
              <div className="space-y-1">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StreakProgress;

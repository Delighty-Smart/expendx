
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, Calendar, Check, Target, Zap, Star, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { STREAK_MILESTONES } from "@/lib/streak";

const StreakProgress = ({ streak }: { streak: any }) => {
  // Find the current milestone and the next milestone
  const currentMilestoneIndex = STREAK_MILESTONES.findIndex(
    milestone => milestone.title === streak.current_title
  );
  
  const nextMilestone = STREAK_MILESTONES[currentMilestoneIndex + 1];
  const currentMilestone = STREAK_MILESTONES[currentMilestoneIndex];
  
  const progress = nextMilestone 
    ? Math.min(100, Math.round((streak.current_streak - currentMilestone.days) / 
      (nextMilestone.days - currentMilestone.days) * 100))
    : 100;
  
  const nextTitle = nextMilestone ? nextMilestone.title : "Ultimate Master";
  const daysToNext = nextMilestone ? nextMilestone.days - streak.current_streak : 0;

  // Create an array of days representing the current week
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
  // Convert to our days array index (where Monday is 0)
  const todayIndex = today === 0 ? 6 : today - 1;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <GlassCard className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-sm">
              <Flame className="h-6 w-6 text-pink-500" />
            </div>
            Your Streak Journey
          </CardTitle>
        </CardHeader>
      </GlassCard>

      {/* Main Streak Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Streak - Hero Card */}
        <div className="lg:col-span-2">
          <GlassCard className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10" />
            <CardContent className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Current Streak</h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-5xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                      {streak.current_streak}
                    </span>
                    <span className="text-xl text-muted-foreground">
                      {streak.current_streak === 1 ? "day" : "days"}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-lg opacity-30 animate-pulse" />
                  <div className="relative p-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-500">
                    <Flame className="h-12 w-12 text-white" />
                  </div>
                </div>
              </div>

              {/* Weekly Progress */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">This Week</h4>
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day, index) => {
                    const isChecked = index < todayIndex;
                    const isToday = index === todayIndex;
                    
                    return (
                      <div key={index} className="flex flex-col items-center gap-2">
                        <div 
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                            isChecked 
                              ? "bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-500/25" 
                              : "bg-white/10 backdrop-blur-sm border border-white/20",
                            isToday && "ring-2 ring-pink-500 ring-offset-2 ring-offset-transparent scale-110"
                          )}
                        >
                          {isChecked ? (
                            <Check className="h-5 w-5 text-white" />
                          ) : isToday ? (
                            <div className="w-3 h-3 rounded-full bg-pink-500" />
                          ) : null}
                        </div>
                        <span className={cn(
                          "text-xs font-medium",
                          isToday ? "text-pink-500" : "text-muted-foreground"
                        )}>
                          {day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </GlassCard>
        </div>

        {/* Current Title Card */}
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10" />
          <CardContent className="relative p-6 flex flex-col items-center text-center space-y-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm">
              <Star className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Current Title</h4>
              <div className="mt-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25">
                <span className="text-white font-bold text-sm">{streak.current_title}</span>
              </div>
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-amber-500/10" />
          <CardContent className="relative p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/25">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{streak.highest_streak}</p>
              <p className="text-sm text-muted-foreground">Highest Streak</p>
            </div>
          </CardContent>
        </GlassCard>
        
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10" />
          <CardContent className="relative p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 shadow-lg shadow-blue-500/25">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{streak.freeze_count}</p>
              <p className="text-sm text-muted-foreground">Streak Freezes</p>
            </div>
          </CardContent>
        </GlassCard>
        
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10" />
          <CardContent className="relative p-6 flex items-center gap-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 shadow-lg shadow-purple-500/25">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{STREAK_MILESTONES.length - currentMilestoneIndex - 1}</p>
              <p className="text-sm text-muted-foreground">Titles Remaining</p>
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Progress to Next Level */}
      {nextMilestone && (
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-blue-500/5" />
          <CardContent className="relative p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-purple-500" />
                <span className="font-semibold">Progress to {nextTitle}</span>
              </div>
              <span className="text-sm font-medium text-purple-500">{progress}%</span>
            </div>
            
            <Progress 
              value={progress} 
              className="h-3 bg-white/10" 
              indicatorClassName="bg-gradient-to-r from-pink-500 to-purple-500"
            />
            
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{streak.current_streak} days completed</span>
              <span>{daysToNext} days to next level</span>
            </div>
          </CardContent>
        </GlassCard>
      )}
    </div>
  );
};

export default StreakProgress;

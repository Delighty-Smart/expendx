
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, Calendar, Check, Target, Zap, Star, Shield, Award } from "lucide-react";
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
      {/* Header Card - Made more compact */}
      <GlassCard className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-sm">
              <Flame className="h-5 w-5 text-pink-500" />
            </div>
            Your Streak Journey
          </CardTitle>
        </CardHeader>
      </GlassCard>

      {/* Main Streak Display - More compact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current Streak - Reduced size */}
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10" />
          <CardContent className="relative p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Streak</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                    {streak.current_streak}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {streak.current_streak === 1 ? "day" : "days"}
                  </span>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-md opacity-30 animate-pulse" />
                <div className="relative p-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500">
                  <Flame className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            {/* Weekly Progress - Smaller */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">This Week</h4>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                  const isChecked = index < todayIndex;
                  const isToday = index === todayIndex;
                  
                  return (
                    <div key={index} className="flex flex-col items-center gap-1">
                      <div 
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300",
                          isChecked 
                            ? "bg-gradient-to-r from-green-400 to-emerald-500 shadow-md shadow-green-500/25" 
                            : "bg-white/10 backdrop-blur-sm border border-white/20",
                          isToday && "ring-2 ring-pink-500 ring-offset-1 ring-offset-transparent scale-110"
                        )}
                      >
                        {isChecked ? (
                          <Check className="h-3 w-3 text-white" />
                        ) : isToday ? (
                          <div className="w-2 h-2 rounded-full bg-pink-500" />
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

        {/* Current Title Card - More compact */}
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10" />
          <CardContent className="relative p-4 flex flex-col items-center text-center space-y-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm">
              <Star className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Title</h4>
              <div className="mt-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25">
                <span className="text-white font-bold text-sm">{streak.current_title}</span>
              </div>
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Stats Row - More compact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-amber-500/10" />
          <CardContent className="relative p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/25">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold">{streak.highest_streak}</p>
              <p className="text-xs text-muted-foreground">Highest Streak</p>
            </div>
          </CardContent>
        </GlassCard>
        
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10" />
          <CardContent className="relative p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 shadow-lg shadow-blue-500/25">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold">{streak.freeze_count}</p>
              <p className="text-xs text-muted-foreground">Streak Freezes</p>
            </div>
          </CardContent>
        </GlassCard>
        
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10" />
          <CardContent className="relative p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 shadow-lg shadow-purple-500/25">
              <Target className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold">{STREAK_MILESTONES.length - currentMilestoneIndex - 1}</p>
              <p className="text-xs text-muted-foreground">Titles Remaining</p>
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Progress to Next Level - Compact */}
      {nextMilestone && (
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-blue-500/5" />
          <CardContent className="relative p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-500" />
                <span className="font-semibold text-sm">Progress to {nextTitle}</span>
              </div>
              <span className="text-sm font-medium text-purple-500">{progress}%</span>
            </div>
            
            <Progress 
              value={progress} 
              className="h-2 bg-white/10" 
              indicatorClassName="bg-gradient-to-r from-pink-500 to-purple-500"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{streak.current_streak} days completed</span>
              <span>{daysToNext} days to next level</span>
            </div>
          </CardContent>
        </GlassCard>
      )}

      {/* New Titles Section */}
      <GlassCard className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm">
              <Award className="h-5 w-5 text-indigo-500" />
            </div>
            All Titles & Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="relative p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {STREAK_MILESTONES.map((milestone, index) => {
              const isUnlocked = streak.current_streak >= milestone.days;
              const isCurrent = milestone.title === streak.current_title;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "relative p-3 rounded-lg border transition-all duration-300",
                    isUnlocked 
                      ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 shadow-md shadow-green-500/10"
                      : "bg-white/5 border-white/10 hover:border-white/20",
                    isCurrent && "ring-2 ring-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isUnlocked ? "bg-green-500" : "bg-gray-400"
                      )} />
                      <div>
                        <p className={cn(
                          "font-semibold text-sm",
                          isCurrent && "text-amber-500"
                        )}>
                          {milestone.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {milestone.days} {milestone.days === 1 ? "day" : "days"} required
                        </p>
                      </div>
                    </div>
                    {isUnlocked && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {isCurrent && !isUnlocked && (
                      <Star className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </GlassCard>
    </div>
  );
};

export default StreakProgress;

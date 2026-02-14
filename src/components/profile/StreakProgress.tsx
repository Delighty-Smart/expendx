import { Card, CardContent, CardHeader, CardTitle, GlassCard } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Flame, Trophy, Calendar, Check, Target, Zap, Star, Shield, Award, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { STREAK_MILESTONES } from "@/lib/streak";
const StreakProgress = ({
  streak
}: {
  streak: any;
}) => {
  // Find the next milestone based on current streak
  const nextMilestone = STREAK_MILESTONES.find(milestone => milestone.days > streak.current_streak);

  // Find the current achieved milestone
  const currentMilestone = [...STREAK_MILESTONES].reverse().find(milestone => streak.current_streak >= milestone.days) || STREAK_MILESTONES[0];
  const progress = nextMilestone ? Math.min(100, Math.round((streak.current_streak - currentMilestone.days) / (nextMilestone.days - currentMilestone.days) * 100)) : 100;
  const nextTitle = nextMilestone ? nextMilestone.title : "Ultimate Master";
  const daysToNext = nextMilestone ? nextMilestone.days - streak.current_streak : 0;

  // Create an array of days representing the current week
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
  // Convert to our days array index (where Monday is 0)
  const todayIndex = today === 0 ? 6 : today - 1;
  return <div className="space-y-6">

    {/* Compact Main Display */}
    <GlassCard className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10" />
      <CardContent className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-md opacity-30 animate-pulse" />
              <div className="relative p-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500">
                <Flame className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Streak</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  {streak.current_streak}
                </span>
                <span className="text-sm text-muted-foreground">
                  {streak.current_streak === 1 ? "day" : "days"}
                </span>

              </div>
            </div>
          </div>


          <div className="text-right">
            <div className="px-2 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25 mb-1">
              <span className="text-white font-bold text-xs">{streak.current_title}</span>
            </div>

          </div>
        </div>

        {/* Compact Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-2xl p-3 flex flex-col items-center justify-center min-h-[80px]">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-amber-500" />
              <p className="text-xl font-bold leading-none">{streak.highest_streak}</p>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Best</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl p-3 flex flex-col items-center justify-center min-h-[80px]">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-blue-500" />
              <p className="text-xl font-bold leading-none">{streak.freeze_count}</p>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Freezes</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-2xl p-3 flex flex-col items-center justify-center min-h-[80px]">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-purple-500" />
              <p className="text-xl font-bold leading-none">{STREAK_MILESTONES.length - STREAK_MILESTONES.findIndex(m => m.days > streak.current_streak)}</p>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Titles</p>
          </div>
        </div>

        {/* Progress to Next Level - Compact */}
        {nextMilestone && <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-purple-500" />
              <span className="font-medium text-xs">Progress to {nextTitle}</span>
            </div>
            <span className="text-xs font-medium text-purple-500">{progress}%</span>
          </div>

          <Progress value={progress} className="h-1.5 bg-white/10" indicatorClassName="bg-gradient-to-r from-pink-500 to-purple-500" />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{streak.current_streak} days completed</span>
            <span>{daysToNext} days to next level</span>
          </div>
        </div>}
      </CardContent>
    </GlassCard>

    {/* Weekly Progress - No Accordion */}
    <GlassCard className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-sm">Weekly Progress</span>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {days.map((day, index) => {
            // Calculate the date for this day of the current week
            // 1. Get start of current week (Monday)
            const now = new Date();
            const currentDay = now.getDay(); // 0-6 (Sun-Sat)
            const diff = currentDay === 0 ? 6 : currentDay - 1; // Days to subtract to get Monday
            const monday = new Date(now);
            monday.setDate(now.getDate() - diff);
            monday.setHours(0, 0, 0, 0);

            // 2. Get date for this column
            const columnDate = new Date(monday);
            columnDate.setDate(monday.getDate() + index);
            columnDate.setHours(0, 0, 0, 0);

            // 3. Get streak date range
            // last_login is the end of the streak
            // start is last_login - (current_streak - 1)
            const lastLoginDate = new Date(streak.last_login);
            lastLoginDate.setHours(0, 0, 0, 0);

            const streakStartDate = new Date(lastLoginDate);
            streakStartDate.setDate(lastLoginDate.getDate() - (streak.current_streak - 1));

            // 4. Check if column date is within range
            // We only fill if it's within the ACTIVE streak
            const isWithinStreak = columnDate >= streakStartDate && columnDate <= lastLoginDate;

            const isToday = index === todayIndex;
            const isFuture = columnDate > now;

            // Visual determination:
            // - Checked: Part of the streak OR (it's today and we just logged in effectively)
            // Actually, if streak.last_login includes today, isWithinStreak covers it.

            return <div key={index} className="flex flex-col items-center gap-2">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                isWithinStreak ? "bg-gradient-to-r from-green-400 to-emerald-500 shadow-md shadow-green-500/25" :
                  "bg-white/10 backdrop-blur-sm border border-white/20",
                isToday && !isWithinStreak && "ring-2 ring-pink-500 ring-offset-1 ring-offset-transparent scale-110"
              )}>
                {isWithinStreak ? <Check className="h-4 w-4 text-white" /> :
                  isToday ? <div className="w-2 h-2 rounded-full bg-pink-500" /> : null}
              </div>
              <span className={cn("text-xs font-medium", isToday ? "text-pink-500" : "text-muted-foreground", isFuture && "opacity-30")}>
                {day}
              </span>
            </div>;
          })}
        </div>
      </CardContent>
    </GlassCard>

    {/* All Titles Accordion Only */}
    <Accordion type="single" collapsible className="space-y-2">
      <AccordionItem value="titles" className="border-none">
        <GlassCard className="overflow-hidden">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-500" />
              <span className="font-medium text-sm">All Titles & Requirements</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {STREAK_MILESTONES.map((milestone, index) => {

                  const isUnlocked = streak.current_streak >= milestone.days;
                  const isCurrent = milestone.title === streak.current_title;
                  const isHighestAchieved = streak.highest_streak >= milestone.days && milestone.days <= streak.highest_streak;
                  return <div key={index} className={cn("relative p-3 rounded-lg border transition-all duration-300", isUnlocked ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30" : isHighestAchieved ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30" : "bg-white/5 border-white/10", isCurrent && "ring-1 ring-amber-500/50")}>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full", isUnlocked ? "bg-green-500" : isHighestAchieved ? "bg-amber-500" : "bg-gray-400")} />
                        <div>
                          <p className={cn("font-medium text-sm", isCurrent && "text-amber-500")}>
                            {milestone.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {milestone.days} {milestone.days === 1 ? "day" : "days"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {isUnlocked && <Check className="h-3 w-3 text-green-500" />}
                        {!isUnlocked && isHighestAchieved && <Star className="h-3 w-3 text-amber-500" />}
                        {isCurrent && <Star className="h-3 w-3 text-amber-500 animate-pulse" />}
                      </div>
                    </div>
                  </div>;
                })}
              </div>
            </div>
          </AccordionContent>
        </GlassCard>
      </AccordionItem>
    </Accordion>
  </div>;

};
export default StreakProgress;

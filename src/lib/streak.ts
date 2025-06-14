
import { addDays, differenceInDays, isSameDay, startOfDay, isToday, isYesterday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface UserStreak {
  id?: string;
  user_id: string;
  current_streak: number;
  highest_streak: number;
  last_login: string;
  freeze_count: number;
  current_title: string;
  created_at: string;
  updated_at: string;
}

export const STREAK_MILESTONES = [
  { days: 1, title: "Budget Beginner" },
  { days: 7, title: "Penny Pioneer" },
  { days: 30, title: "Savings Strategist" },
  { days: 90, title: "Cashflow Commander" },
  { days: 180, title: "Wealth Warrior" },
  { days: 365, title: "Money Maestro" },
  { days: 730, title: "Fiscal Legend" },
];

export const MAX_FREEZE_DAYS = 3;

export async function updateUserStreak(): Promise<UserStreak | null> {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get current user streak or create if not exists
    const { data: streakData, error: streakError } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (streakError && !streakError.message.includes("no rows")) {
      console.error("Error fetching streak:", streakError);
      return null;
    }

    const now = new Date();
    const today = startOfDay(now);

    // If no streak data exists yet, create new streak record
    if (!streakData) {
      const { data: newStreak, error: insertError } = await supabase
        .from("user_streaks")
        .insert([{ 
          user_id: user.id, 
          current_streak: 1, 
          highest_streak: 1,
          current_title: "Budget Beginner", 
          freeze_count: MAX_FREEZE_DAYS,
          last_login: today.toISOString()
        }])
        .select()
        .single();
        
      if (insertError) {
        console.error("Error creating streak:", insertError);
        return null;
      }
      
      await createStreakAlert(user.id, "Welcome! Your streak journey begins now. Keep logging in daily to build your streak!", "streak");
      return newStreak;
    }

    const lastLogin = startOfDay(new Date(streakData.last_login));
    const daysSinceLastLogin = differenceInDays(today, lastLogin);

    // If same day, don't update streak but return current data
    if (isSameDay(today, lastLogin)) {
      return streakData;
    }

    // Enhanced streak logic with better consistency
    let newStreak = streakData.current_streak;
    let freezeCount = streakData.freeze_count;
    let currentTitle = streakData.current_title;
    let shouldCreateAlert = false;
    let alertMessage = "";

    if (daysSinceLastLogin === 1) {
      // Perfect consecutive day - increment streak and reset freeze count
      newStreak += 1;
      freezeCount = MAX_FREEZE_DAYS;
      
      // Check for milestone achievement
      const milestone = STREAK_MILESTONES.find(m => m.days === newStreak);
      if (milestone && milestone.title !== currentTitle) {
        shouldCreateAlert = true;
        alertMessage = `🎉 Congratulations! You've achieved a ${newStreak}-day streak and earned the "${milestone.title}" title!`;
        currentTitle = milestone.title;
      } else if (newStreak % 7 === 0 && newStreak > 7) {
        // Celebrate weekly milestones
        shouldCreateAlert = true;
        alertMessage = `🔥 Amazing! You've maintained your streak for ${newStreak} days straight! Keep it up!`;
      }
    } else if (daysSinceLastLogin > 1) {
      // Gap in login days
      if (daysSinceLastLogin <= MAX_FREEZE_DAYS && freezeCount >= (daysSinceLastLogin - 1)) {
        // Within freeze window and have enough freeze credits
        const freezeUsed = daysSinceLastLogin - 1;
        freezeCount = Math.max(0, freezeCount - freezeUsed);
        newStreak += 1; // Still count as consecutive due to freeze
        
        shouldCreateAlert = true;
        alertMessage = `⚡ Streak saved! You used ${freezeUsed} freeze ${freezeUsed === 1 ? 'credit' : 'credits'}. You have ${freezeCount} remaining.`;
      } else {
        // Streak broken - reset
        const oldStreak = streakData.current_streak;
        newStreak = 1; // Start fresh with today's login
        freezeCount = MAX_FREEZE_DAYS;
        
        // Reset title if streak was significant
        if (oldStreak >= 30) {
          currentTitle = "Budget Beginner";
          shouldCreateAlert = true;
          alertMessage = `💔 Your ${oldStreak}-day streak has been reset after ${daysSinceLastLogin} days of inactivity. But don't give up - start building again!`;
        } else if (oldStreak >= 7) {
          shouldCreateAlert = true;
          alertMessage = `😔 Your streak was reset, but every expert was once a beginner. Start your comeback today!`;
        }
      }
    }

    // Ensure title matches current streak level
    const correctTitle = determineUserTitle(newStreak);
    if (correctTitle !== currentTitle && getMilestoneRank(correctTitle) > getMilestoneRank(currentTitle)) {
      currentTitle = correctTitle;
      if (!shouldCreateAlert) {
        shouldCreateAlert = true;
        alertMessage = `🌟 Level up! You've earned the "${correctTitle}" title!`;
      }
    }

    // Calculate highest streak
    const highestStreak = Math.max(streakData.highest_streak, newStreak);
    const isNewRecord = highestStreak > streakData.highest_streak;

    // Update streak in database
    const { data: updatedStreak, error: updateError } = await supabase
      .from("user_streaks")
      .update({
        current_streak: newStreak,
        highest_streak: highestStreak,
        last_login: today.toISOString(),
        freeze_count: freezeCount,
        current_title: currentTitle
      })
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating streak:", updateError);
      return null;
    }

    // Create alerts for important events
    if (shouldCreateAlert && alertMessage) {
      await createStreakAlert(user.id, alertMessage, "streak");
    }

    // Special alert for new personal records
    if (isNewRecord && newStreak > 1) {
      await createStreakAlert(user.id, `🏆 New personal record! ${newStreak} days is your longest streak yet!`, "achievement");
    }

    return updatedStreak;
  } catch (error) {
    console.error("Error in updateUserStreak:", error);
    return null;
  }
}

// Helper function to create streak alerts
async function createStreakAlert(userId: string, message: string, type: string) {
  try {
    await supabase.from('alerts').insert({
      user_id: userId,
      title: type === 'achievement' ? 'Achievement Unlocked!' : 'Streak Update',
      message: message,
      type: type,
      read: false
    });
  } catch (error) {
    console.error("Error creating streak alert:", error);
  }
}

// Helper to determine user title based on current streak
export function determineUserTitle(dayCount: number): string {
  const milestone = [...STREAK_MILESTONES]
    .reverse()
    .find(m => dayCount >= m.days);
  
  return milestone ? milestone.title : "Budget Beginner";
}

// Helper to get the rank of a milestone title
function getMilestoneRank(title: string): number {
  const index = STREAK_MILESTONES.findIndex(m => m.title === title);
  return index === -1 ? 0 : index;
}

// Get formatted streak text
export function getStreakText(streak: number): string {
  return streak === 1 ? "1 day" : `${streak} days`;
}

// Enhanced function to check if user can maintain streak
export function canMaintainStreak(lastLogin: string, freezeCount: number): boolean {
  const lastLoginDate = startOfDay(new Date(lastLogin));
  const today = startOfDay(new Date());
  const daysSince = differenceInDays(today, lastLoginDate);
  
  if (daysSince <= 1) return true; // Today or yesterday
  return daysSince - 1 <= freezeCount; // Can use freeze credits
}

// Get streak status for UI display
export function getStreakStatus(streak: UserStreak): {
  status: 'active' | 'at_risk' | 'broken';
  message: string;
  canRecover: boolean;
} {
  const lastLogin = startOfDay(new Date(streak.last_login));
  const today = startOfDay(new Date());
  const daysSince = differenceInDays(today, lastLogin);
  
  if (isToday(lastLogin)) {
    return {
      status: 'active',
      message: 'Streak is active! Keep it up!',
      canRecover: false
    };
  }
  
  if (isYesterday(lastLogin)) {
    return {
      status: 'at_risk',
      message: 'Log in today to maintain your streak!',
      canRecover: true
    };
  }
  
  if (daysSince <= MAX_FREEZE_DAYS + 1 && streak.freeze_count > 0) {
    return {
      status: 'at_risk',
      message: `You can still save your streak with ${streak.freeze_count} freeze credits!`,
      canRecover: true
    };
  }
  
  return {
    status: 'broken',
    message: 'Streak broken, but you can start fresh!',
    canRecover: false
  };
}

// Get user profile data including email
export async function getUserProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    
    if (error && !error.message.includes("no rows")) {
      console.error("Error fetching user profile:", error);
      return null;
    }
    
    // If profile doesn't exist, create one
    if (!profile) {
      const { data: newProfile, error: createError } = await supabase
        .from("user_profiles")
        .insert({
          id: user.id,
          email: user.email,
          username: user.email?.split('@')[0] || 'user'
        })
        .select()
        .single();
        
      if (createError) {
        console.error("Error creating user profile:", createError);
        return null;
      }
      
      return newProfile;
    }
    
    return profile;
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
}

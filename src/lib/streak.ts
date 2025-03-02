
import { addDays, differenceInDays, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface UserStreak {
  id: string;
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

    if (streakError) {
      console.error("Error fetching streak:", streakError);
      return null;
    }

    // If no streak data exists yet, create new streak record
    if (!streakData) {
      const { data: newStreak, error: insertError } = await supabase
        .from("user_streaks")
        .insert([{ 
          user_id: user.id, 
          current_streak: 1, 
          highest_streak: 1,
          current_title: "Budget Beginner", 
          freeze_count: MAX_FREEZE_DAYS
        }])
        .select()
        .single();
        
      if (insertError) {
        console.error("Error creating streak:", insertError);
        return null;
      }
      
      return newStreak;
    }

    // Calculate days since last login
    const lastLogin = new Date(streakData.last_login);
    const today = new Date();
    const daysSinceLastLogin = differenceInDays(today, lastLogin);

    // If same day, don't update streak
    if (isSameDay(today, lastLogin)) {
      return streakData;
    }

    let newStreak = streakData.current_streak;
    let freezeCount = streakData.freeze_count;
    let currentTitle = streakData.current_title;
    
    // Update streak based on last login time
    if (daysSinceLastLogin === 1) {
      // Consecutive day login, increment streak
      newStreak += 1;
      freezeCount = MAX_FREEZE_DAYS; // Reset freeze count when logging in consecutive days
    } else if (daysSinceLastLogin > 1 && daysSinceLastLogin <= MAX_FREEZE_DAYS) {
      // Within freeze window, decrement freeze count but maintain streak
      freezeCount = Math.max(0, freezeCount - (daysSinceLastLogin - 1));
      newStreak += 1; // Still increment streak since they logged in within freeze period
    } else if (daysSinceLastLogin > MAX_FREEZE_DAYS) {
      // Beyond freeze window, reset streak
      newStreak = 1;
      freezeCount = MAX_FREEZE_DAYS;
    }

    // Check if new streak has reached a new milestone
    const newMilestone = determineUserTitle(newStreak);
    if (getMilestoneRank(newMilestone) > getMilestoneRank(currentTitle)) {
      currentTitle = newMilestone;
    }

    // Update streak in database
    const { data: updatedStreak, error: updateError } = await supabase
      .from("user_streaks")
      .update({
        current_streak: newStreak,
        highest_streak: Math.max(streakData.highest_streak, newStreak),
        last_login: new Date().toISOString(),
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

    return updatedStreak;
  } catch (error) {
    console.error("Error in updateUserStreak:", error);
    return null;
  }
}

// Helper to determine user title based on current streak
export function determineUserTitle(dayCount: number): string {
  // Find the highest milestone that the user has achieved
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

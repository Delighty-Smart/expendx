import { startOfDay, differenceInCalendarDays } from "date-fns";
import { supabase, getTable } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Define milestone titles
export const streakTitles = {
  1: "Budget Beginner",
  3: "Finance Fledgling",
  7: "Money Manager",
  14: "Budget Boss",
  30: "Finance Veteran",
  60: "Money Master",
  90: "Budget Guru",
  180: "Finance Wizard",
  365: "Money Mogul"
};

export type StreakTitle = typeof streakTitles[keyof typeof streakTitles];

interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  current_title: StreakTitle;
  highest_streak: number;
  freeze_count: number;
  last_login: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfileData {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  continent?: string;
  country?: string;
  bio?: string;
}

/**
 * Get the highest title milestone that the user has reached
 * @param {number} currentStreak - User's current streak count
 * @returns {string} The title earned based on streak milestones
 */
export const getTitleForStreak = (currentStreak: number): StreakTitle => {
  const milestones = Object.keys(streakTitles)
    .map(Number)
    .sort((a, b) => b - a); // Sort in descending order

  for (const milestone of milestones) {
    if (currentStreak >= milestone) {
      return streakTitles[milestone as keyof typeof streakTitles];
    }
  }

  return "Budget Beginner"; // Default title
};

/**
 * Check and update the user's streak based on last login time
 * @returns {Promise<{streak: number, title: string} | null>} Updated streak data or null if error
 */
export const checkAndUpdateStreak = async (): Promise<{
  currentStreak: number;
  highestStreak: number;
  title: string;
  freezeCount: number;
} | null> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get user's streak data
    const { data: streakData, error } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching streak data:", error);
      return null;
    }

    const streak = streakData as UserStreak;
    const today = startOfDay(new Date()).toISOString();
    const lastLogin = startOfDay(new Date(streak.last_login)).toISOString();

    // If already logged in today, don't update streak
    if (today === lastLogin) {
      return {
        currentStreak: streak.current_streak,
        highestStreak: streak.highest_streak,
        title: streak.current_title,
        freezeCount: streak.freeze_count
      };
    }

    // Calculate days since last login
    const daysSinceLastLogin = differenceInCalendarDays(
      new Date(),
      new Date(streak.last_login)
    );

    let updatedStreak = { ...streak };

    // If 1 day since last login, increment streak
    if (daysSinceLastLogin === 1) {
      updatedStreak.current_streak += 1;
      
      // Update highest streak if current is higher
      if (updatedStreak.current_streak > updatedStreak.highest_streak) {
        updatedStreak.highest_streak = updatedStreak.current_streak;
      }
      
      // Update title if milestone reached
      updatedStreak.current_title = getTitleForStreak(updatedStreak.current_streak);
    } 
    // If more than 1 day since last login but have freeze available
    else if (daysSinceLastLogin > 1 && streak.freeze_count > 0) {
      // Use a streak freeze
      updatedStreak.freeze_count -= 1;
      
      // Create an alert about using streak freeze
      await getTable("alerts").insert({
        user_id: user.id,
        title: "Streak Freeze Used",
        message: `You missed a day, but we used a streak freeze to maintain your ${streak.current_streak}-day streak. You have ${updatedStreak.freeze_count} freezes remaining.`,
        type: "streak_freeze"
      });
      
      toast.info("Streak freeze used to maintain your streak!");
    } 
    // If more than 1 day and no freezes available, reset streak
    else if (daysSinceLastLogin > 1) {
      updatedStreak.current_streak = 1;
      updatedStreak.current_title = getTitleForStreak(1);
      
      // Create an alert about losing streak
      await getTable("alerts").insert({
        user_id: user.id,
        title: "Streak Lost",
        message: `You missed logging in for ${daysSinceLastLogin} days and your streak has been reset. Your highest streak was ${streak.highest_streak} days.`,
        type: "streak_freeze"
      });
      
      toast.warning("Your streak has been reset due to inactivity");
    }

    // Update the last login time to today
    updatedStreak.last_login = new Date().toISOString();

    // Update the streak in the database
    const { error: updateError } = await supabase
      .from("user_streaks")
      .update({
        current_streak: updatedStreak.current_streak,
        highest_streak: updatedStreak.highest_streak,
        current_title: updatedStreak.current_title,
        freeze_count: updatedStreak.freeze_count,
        last_login: updatedStreak.last_login
      })
      .eq("id", streak.id);

    if (updateError) {
      console.error("Error updating streak:", updateError);
      return null;
    }

    return {
      currentStreak: updatedStreak.current_streak,
      highestStreak: updatedStreak.highest_streak,
      title: updatedStreak.current_title,
      freezeCount: updatedStreak.freeze_count
    };
  } catch (error) {
    console.error("Error in checkAndUpdateStreak:", error);
    return null;
  }
};

/**
 * Fetch the user's streak data without updating it
 * @returns {Promise<{streak: number, title: string} | null>} User's streak data or null if error
 */
export const getUserStreakData = async () => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Get user's streak data
    const { data, error } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();
      
    if (error) {
      console.error("Error fetching streak data:", error);
      return null;
    }
    
    return {
      currentStreak: data.current_streak,
      highestStreak: data.highest_streak,
      title: data.current_title,
      freezeCount: data.freeze_count
    };
  } catch (error) {
    console.error("Error in getUserStreakData:", error);
    return null;
  }
};

/**
 * Update user streak data (renamed from checkAndUpdateStreak)
 * @returns Updated streak data or null if error
 */
export const updateUserStreak = async () => {
  try {
    const result = await checkAndUpdateStreak();
    return result;
  } catch (error) {
    console.error("Error updating user streak:", error);
    return null;
  }
};

/**
 * Get the user profile data
 * @returns User profile data or null if error
 */
export const getUserProfile = async (): Promise<UserProfileData | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();
      
    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
    
    return data as UserProfileData;
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
};

/**
 * Get streak progress text (used in Index.tsx)
 */
export const getStreakText = (streak: number): string => {
  if (streak <= 0) return "Start your streak today!";
  if (streak === 1) return "First day! Keep going!";
  if (streak < 7) return `${streak} day streak! Great start!`;
  if (streak < 30) return `${streak} day streak! Impressive consistency!`;
  return `${streak} day streak! You're a financial master!`;
};

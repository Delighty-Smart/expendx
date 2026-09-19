import { addDays, differenceInDays, isSameDay, startOfDay, isToday, isYesterday } from "date-fns";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc } from "firebase/firestore";

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

export interface StreakStatusData {
  current_streak: number;
  last_login: string;
  freeze_count: number;
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
    const user = auth.currentUser;
    if (!user) {
      console.log("No user in updateUserStreak, skipping");
      return null;
    }

    const streakRef = doc(db, "user_streaks", user.uid);
    const streakSnap = await getDoc(streakRef);
    const now = new Date();
    const today = startOfDay(now);

    if (!streakSnap.exists()) {
      console.log("Creating new streak record for user:", user.uid);
      const newStreakData: UserStreak = {
        id: user.uid,
        user_id: user.uid,
        current_streak: 1,
        highest_streak: 1,
        current_title: "Budget Beginner",
        freeze_count: MAX_FREEZE_DAYS,
        last_login: today.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await setDoc(streakRef, newStreakData);
      try {
        await createStreakAlert(user.uid, "Welcome! Your streak journey begins now. Keep logging in daily to build your streak!", "streak");
      } catch (err) {
        console.warn("Failed to create initial streak alert, ignoring.");
      }
      return newStreakData;
    }

    const streakData = streakSnap.data() as UserStreak;
    const lastLogin = startOfDay(new Date(streakData.last_login));
    const daysSinceLastLogin = differenceInDays(today, lastLogin);

    let newStreak = streakData.current_streak;
    let freezeCount = streakData.freeze_count;
    let currentTitle = streakData.current_title;
    let highestStreak = streakData.highest_streak;
    let shouldUpdateDB = false;
    let shouldCreateAlert = false;
    let alertMessage = "";

    // 1. Handle actual streak updates (not the same day)
    if (!isSameDay(today, lastLogin)) {
      if (daysSinceLastLogin === 1) {
        // Consecutive day
        newStreak += 1;
        freezeCount = MAX_FREEZE_DAYS; // Reset freezes on activity
        shouldUpdateDB = true;
      } else if (daysSinceLastLogin > 1) {
        // Gap in login
        if (daysSinceLastLogin <= MAX_FREEZE_DAYS + 1 && freezeCount >= (daysSinceLastLogin - 1)) {
          const freezeUsed = daysSinceLastLogin - 1;
          freezeCount = Math.max(0, freezeCount - freezeUsed);
          newStreak += 1;
          shouldUpdateDB = true;
          shouldCreateAlert = true;
          alertMessage = `⚡ Streak saved! You used ${freezeUsed} freeze ${freezeUsed === 1 ? 'credit' : 'credits'}. You have ${freezeCount} remaining.`;
        } else {
          // Streak broken
          newStreak = 1;
          freezeCount = MAX_FREEZE_DAYS;
          shouldUpdateDB = true;
          shouldCreateAlert = true;
          alertMessage = streakData.current_streak >= 7 ?
            "😔 Your streak was reset, but every expert was once a beginner. Start your comeback today!" :
            "💔 Your streak has been reset. Log in daily to build it back up!";
        }
      }
    }

    // 2. Always verify title consistency regardless of same day
    const correctTitle = determineUserTitle(newStreak);
    if (correctTitle !== currentTitle) {
      if (getMilestoneRank(correctTitle) > getMilestoneRank(currentTitle) && newStreak > streakData.current_streak) {
        shouldCreateAlert = true;
        alertMessage = `🌟 Level up! You've earned the "${correctTitle}" title!`;
      }
      currentTitle = correctTitle;
      shouldUpdateDB = true;
    }

    // 3. Update highest streak record
    if (newStreak > highestStreak) {
      highestStreak = newStreak;
      shouldUpdateDB = true;
      if (newStreak > 1 && !isSameDay(today, lastLogin)) {
        await createStreakAlert(user.uid, `🏆 New personal record! ${newStreak} days is your longest streak yet!`, "achievement");
      }
    }

    // 4. Perform database update if needed
    if (shouldUpdateDB || !isSameDay(today, lastLogin)) {
      const updatedFields = {
        current_streak: newStreak,
        highest_streak: highestStreak,
        last_login: today.toISOString(),
        freeze_count: freezeCount,
        current_title: currentTitle,
        updated_at: now.toISOString()
      };

      await updateDoc(streakRef, updatedFields);

      if (shouldCreateAlert && alertMessage) {
        await createStreakAlert(user.uid, alertMessage, "streak");
      }

      return { ...streakData, ...updatedFields };
    }

    return streakData;
  } catch (error) {
    console.error("Error in updateUserStreak:", error);
    return null;
  }
}

// Helper function to create streak alerts
async function createStreakAlert(userId: string, message: string, type: string) {
  try {
    const alertsRef = collection(db, 'alerts');
    await addDoc(alertsRef, {
      user_id: userId,
      title: type === 'achievement' ? 'Achievement Unlocked!' : 'Streak Update',
      message: message,
      type: type,
      read: false,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error creating streak alert:", error);
  }
}

// Helper to determine user title based on current streak
export function determineUserTitle(dayCount: number): string {
  if (dayCount < 1) return "Budget Beginner";

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
export function getStreakStatus(streak: StreakStatusData): {
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

// Get user profile data from Firestore
export async function getUserProfile() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log("No user in getUserProfile, skipping");
      return null;
    }

    const profileRef = doc(db, "user_profiles", user.uid);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      return { id: profileSnap.id, ...profileSnap.data() };
    }

    // If profile doesn't exist, create one
    console.log("Creating new profile for user:", user.uid);
    const newProfile = {
      id: user.uid,
      email: user.email || "",
      username: user.email?.split('@')[0] || 'user',
      role: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await setDoc(profileRef, newProfile);
    return newProfile;
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
}

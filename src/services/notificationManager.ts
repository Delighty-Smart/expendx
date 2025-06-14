
import { supabase } from "@/integrations/supabase/client";
import { notificationService } from "./notificationService";

export type NotificationType = 
  | 'weekly_recap'
  | 'budget_nudges'
  | 'unusual_activity'
  | 'daily_log_reminder'
  | 'savings_progress'
  | 'month_reset_preview'
  | 'recurring_expense_reminder'
  | 'night_owl_checkin'
  | 'monthly_snapshot'
  | 'reflection_prompts'
  | 'custom_goal_reminder'
  | 'business_mode_nudges';

export interface NotificationPreferences {
  id?: string;
  user_id: string;
  weekly_recap: boolean;
  budget_nudges: boolean;
  unusual_activity: boolean;
  daily_log_reminder: boolean;
  savings_progress: boolean;
  month_reset_preview: boolean;
  recurring_expense_reminder: boolean;
  night_owl_checkin: boolean;
  monthly_snapshot: boolean;
  reflection_prompts: boolean;
  custom_goal_reminder: boolean;
  business_mode_nudges: boolean;
  preferred_time: string;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationData {
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, any>;
}

export const notificationManager = {
  // Get user's notification preferences
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }
  },

  // Update user's notification preferences
  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  },

  // Create an alert in the database
  async createAlert(userId: string, data: NotificationData): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('alerts')
        .insert({
          user_id: userId,
          title: data.title,
          message: data.message,
          type: data.type,
          read: false
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating alert:', error);
      return false;
    }
  },

  // Send notification and create alert
  async sendNotification(userId: string, data: NotificationData): Promise<boolean> {
    try {
      // Check if user has this notification type enabled
      const preferences = await this.getPreferences(userId);
      if (!preferences || !preferences[data.type as keyof NotificationPreferences]) {
        return false;
      }

      // Create alert in database
      await this.createAlert(userId, data);

      // Send browser notification if supported and permitted
      await notificationService.sendNotification(data.title, data.message);

      // Log the notification
      await this.logNotification(userId, data.type, data.metadata);

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  },

  // Log notification to track what was sent
  async logNotification(userId: string, type: NotificationType, metadata?: Record<string, any>): Promise<void> {
    try {
      await supabase
        .from('user_notification_logs')
        .insert({
          user_id: userId,
          notification_type: type,
          metadata: metadata || {}
        });
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  },

  // Check if notification was recently sent to avoid spam
  async wasRecentlySent(userId: string, type: NotificationType, hoursAgo: number = 24): Promise<boolean> {
    try {
      const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('user_notification_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('notification_type', type)
        .gte('sent_at', cutoff)
        .limit(1);

      if (error) throw error;
      return (data && data.length > 0);
    } catch (error) {
      console.error('Error checking recent notifications:', error);
      return false;
    }
  },

  // Smart notification triggers
  async triggerBudgetNudge(userId: string, category: string, percentage: number, spent: number, limit: number): Promise<void> {
    if (await this.wasRecentlySent(userId, 'budget_nudges', 6)) return;

    const data: NotificationData = {
      title: "Budget Nudge 🎯",
      message: `Just a heads-up — you've used ${percentage}% of your ${category} budget this month. Want to review?`,
      type: 'budget_nudges',
      metadata: { category, percentage, spent, limit }
    };

    await this.sendNotification(userId, data);
  },

  async triggerSavingsProgress(userId: string, goalName: string, percentage: number, currentAmount: number, targetAmount: number): Promise<void> {
    if (await this.wasRecentlySent(userId, 'savings_progress', 24)) return;

    const data: NotificationData = {
      title: "Savings Progress Spark 🪙",
      message: `Boom! You're ${percentage}% closer to your ${goalName} goal. Let's keep it rolling!`,
      type: 'savings_progress',
      metadata: { goalName, percentage, currentAmount, targetAmount }
    };

    await this.sendNotification(userId, data);
  },

  async triggerDailyLogReminder(userId: string): Promise<void> {
    if (await this.wasRecentlySent(userId, 'daily_log_reminder', 20)) return;

    const data: NotificationData = {
      title: "Quick Log Reminder 🧾",
      message: "Your wallet's waiting for your say-so. Quick 5-sec log?",
      type: 'daily_log_reminder'
    };

    await this.sendNotification(userId, data);
  },

  async triggerUnusualActivity(userId: string, amount: number, category: string): Promise<void> {
    if (await this.wasRecentlySent(userId, 'unusual_activity', 12)) return;

    const data: NotificationData = {
      title: "Unusual Activity Alert 💸",
      message: "Spotted something different in your spend pattern. You good?",
      type: 'unusual_activity',
      metadata: { amount, category }
    };

    await this.sendNotification(userId, data);
  },

  async triggerMonthResetPreview(userId: string): Promise<void> {
    if (await this.wasRecentlySent(userId, 'month_reset_preview', 72)) return;

    const data: NotificationData = {
      title: "Month Reset Preview 🔄",
      message: "A fresh month's around the corner. Want to review or tweak your budgets?",
      type: 'month_reset_preview'
    };

    await this.sendNotification(userId, data);
  }
};


import { supabase } from '@/integrations/supabase/client';
import { notificationService } from './notificationService';

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

interface NotificationData {
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, any>;
}

class NotificationManager {
  private static instance: NotificationManager;
  private lastNotificationTime: Record<string, number> = {};
  private readonly RATE_LIMIT_MS = 60000; // 1 minute between notifications of same type

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async sendNotification(userId: string, notification: NotificationData): Promise<boolean> {
    try {
      // Check rate limiting
      const rateKey = `${userId}-${notification.type}`;
      const now = Date.now();
      
      if (this.lastNotificationTime[rateKey] && 
          now - this.lastNotificationTime[rateKey] < this.RATE_LIMIT_MS) {
        console.log(`Rate limited notification for ${notification.type}`);
        return false;
      }

      // Check user preferences
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!preferences || !preferences[notification.type]) {
        console.log(`User has disabled ${notification.type} notifications`);
        return false;
      }

      // Create alert in database
      const { error: alertError } = await supabase
        .from('alerts')
        .insert({
          user_id: userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          read: false
        });

      if (alertError) {
        console.error('Error creating alert:', alertError);
        return false;
      }

      // Log the notification
      const { error: logError } = await supabase
        .from('user_notification_logs')
        .insert({
          user_id: userId,
          notification_type: notification.type,
          metadata: notification.metadata || {}
        });

      if (logError) {
        console.error('Error logging notification:', logError);
      }

      // Send browser notification if supported and permitted
      await notificationService.sendNotification(
        notification.title,
        notification.message
      );

      this.lastNotificationTime[rateKey] = now;
      return true;

    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  // Specific notification methods
  async sendWeeklyRecap(userId: string, weeklyData: any): Promise<boolean> {
    return this.sendNotification(userId, {
      title: "📅 Your Weekly Wallet Recap",
      message: "Your money told a story this week. Want to hear it?",
      type: 'weekly_recap',
      metadata: weeklyData
    });
  }

  async sendBudgetNudge(userId: string, category: string, percentage: number): Promise<boolean> {
    return this.sendNotification(userId, {
      title: "🎯 Budget Nudge",
      message: `Just a heads-up — you've used ${percentage}% of your ${category} budget this month. Want to review?`,
      type: 'budget_nudges',
      metadata: { category, percentage }
    });
  }

  async sendUnusualActivity(userId: string, amount: number): Promise<boolean> {
    return this.sendNotification(userId, {
      title: "💸 Unusual Activity Alert",
      message: "Spotted something different in your spend pattern. You good?",
      type: 'unusual_activity',
      metadata: { amount }
    });
  }

  async sendDailyLogReminder(userId: string): Promise<boolean> {
    return this.sendNotification(userId, {
      title: "🧾 Daily Log Reminder",
      message: "Your wallet's waiting for your say-so. Quick 5-sec log?",
      type: 'daily_log_reminder'
    });
  }

  async sendSavingsProgress(userId: string, goalName: string, percentage: number): Promise<boolean> {
    return this.sendNotification(userId, {
      title: "🪙 Savings Progress Spark",
      message: `Boom! You're ${percentage}% closer to your ${goalName} goal. Let's keep it rolling!`,
      type: 'savings_progress',
      metadata: { goalName, percentage }
    });
  }

  async sendMonthResetPreview(userId: string): Promise<boolean> {
    return this.sendNotification(userId, {
      title: "🔄 End-of-Month Reset Preview",
      message: "A fresh month's around the corner. Want to review or tweak your budgets?",
      type: 'month_reset_preview'
    });
  }

  async sendRecurringExpenseReminder(userId: string, expenseName: string, daysLeft: number): Promise<boolean> {
    return this.sendNotification(userId, {
      title: "🔁 Recurring Expense Reminder",
      message: `Hey, ${expenseName}'s coming up in ${daysLeft} days. Got it covered?`,
      type: 'recurring_expense_reminder',
      metadata: { expenseName, daysLeft }
    });
  }

  async sendNightOwlCheckin(userId: string): Promise<boolean> {
    return this.sendNotification(userId, {
      title: "🌙 Night Owl Check-in",
      message: "Midnight thoughts? This might be a good time to review your day's spending.",
      type: 'night_owl_checkin'
    });
  }

  async sendMonthlySnapshot(userId: string, monthData: any): Promise<boolean> {
    return this.sendNotification(userId, {
      title: "📈 Monthly Financial Snapshot",
      message: "Your month at a glance — here's what your money looked like!",
      type: 'monthly_snapshot',
      metadata: monthData
    });
  }

  async sendReflectionPrompt(userId: string): Promise<boolean> {
    return this.sendNotification(userId, {
      title: "🪞 Reflection Prompt",
      message: "How did spending make you feel this week? Want to leave a note?",
      type: 'reflection_prompts'
    });
  }

  async sendCustomGoalReminder(userId: string, goalName: string, amountLeft: number, currency: string): Promise<boolean> {
    return this.sendNotification(userId, {
      title: "⚙️ Custom Goal Reminder",
      message: `Still dreaming of that ${goalName}? You're ${currency}${amountLeft.toLocaleString()} away!`,
      type: 'custom_goal_reminder',
      metadata: { goalName, amountLeft, currency }
    });
  }

  async sendBusinessModeNudge(userId: string, stats: any): Promise<boolean> {
    return this.sendNotification(userId, {
      title: "💼 Business Mode Nudge",
      message: `${stats.clients} clients, ${stats.expenses} expenses, 1 you — update your business tab before bed?`,
      type: 'business_mode_nudges',
      metadata: stats
    });
  }
}

export const notificationManager = NotificationManager.getInstance();

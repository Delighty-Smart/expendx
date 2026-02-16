
import { supabase } from '@/integrations/supabase/client';
import { notificationService } from './notificationService';

export interface NotificationSchedule {
  type: string;
  defaultTime: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'conditional';
  category: 'critical' | 'consistency' | 'bills' | 'growth';
}

export const NOTIFICATION_SCHEDULES: NotificationSchedule[] = [
  // Consistency Nudges
  {
    type: 'daily_log_reminder',
    defaultTime: '19:00',
    description: 'Review and log daily expenses',
    frequency: 'daily',
    category: 'consistency'
  },
  {
    type: 'streak_protection',
    defaultTime: '21:00',
    description: 'Alerts when your streak is at risk',
    frequency: 'conditional',
    category: 'consistency'
  },
  // Critical Alerts
  {
    type: 'budget_breach',
    defaultTime: '09:00',
    description: 'Instant alerts for budget limits',
    frequency: 'conditional',
    category: 'critical'
  },
  {
    type: 'unusual_activity',
    defaultTime: '20:00',
    description: 'Alerts for unexpected spending',
    frequency: 'conditional',
    category: 'critical'
  },
  // Bill Reminders
  {
    type: 'recurring_expense_reminder',
    defaultTime: '08:00',
    description: 'Reminders for upcoming bills',
    frequency: 'conditional',
    category: 'bills'
  },
  // Growth Insights
  {
    type: 'weekly_recap',
    defaultTime: '10:00',
    description: 'Sunday financial review',
    frequency: 'weekly',
    category: 'growth'
  },
  {
    type: 'monthly_snapshot',
    defaultTime: '10:30',
    description: 'Monthly financial review',
    frequency: 'monthly',
    category: 'growth'
  }
];

export const getDefaultTimeForNotification = (notificationType: string): string => {
  const schedule = NOTIFICATION_SCHEDULES.find(s => s.type === notificationType);
  return schedule?.defaultTime || '19:00';
};

export const getNotificationDescription = (notificationType: string): string => {
  const schedule = NOTIFICATION_SCHEDULES.find(s => s.type === notificationType);
  return schedule?.description || 'Notification timing';
};

class NotificationScheduler {
  private static instance: NotificationScheduler;
  private activeSchedules: Map<string, ReturnType<typeof setTimeout>> = new Map();

  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  async scheduleNotification(
    userId: string,
    notificationType: string,
    preferredTime: string,
    enabled: boolean
  ): Promise<void> {
    this.clearSchedule(`${userId}-${notificationType}`);

    if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const scheduleKey = `${userId}-${notificationType}`;
    const [hour, minute] = preferredTime.split(':').map(s => parseInt(s, 10));
    const now = new Date();
    const nextNotification = new Date();
    nextNotification.setHours(hour, minute, 0, 0);

    if (nextNotification <= now) {
      nextNotification.setDate(nextNotification.getDate() + 1);
    }

    const msUntil = nextNotification.getTime() - now.getTime();

    const timer = setTimeout(async () => {
      await this.triggerNotification(userId, notificationType);
      this.scheduleNotification(userId, notificationType, preferredTime, enabled);
    }, msUntil);

    this.activeSchedules.set(scheduleKey, timer);
  }

  /**
   * Triggers an immediate device notification for critical events (budget breaches, etc.)
   */
  async handleImmediateAlert(userId: string, type: string, title: string, message: string): Promise<void> {
    try {
      if (Notification.permission === 'granted') {
        await notificationService.sendServiceWorkerNotification(title, message, {
          tag: type,
          requireInteraction: true // Keep critical alerts on screen
        });
      }

      await supabase
        .from('alerts')
        .insert({
          user_id: userId,
          title,
          message,
          type
        });
    } catch (error) {
      console.error('Error handling immediate alert:', error);
    }
  }

  private async triggerNotification(userId: string, notificationType: string): Promise<void> {
    try {
      const notificationData = this.getNotificationContent(notificationType);

      if (Notification.permission === 'granted') {
        await notificationService.sendServiceWorkerNotification(notificationData.title, notificationData.message, {
          tag: notificationType
        });
      }

      await supabase
        .from('alerts')
        .upsert(
          {
            user_id: userId,
            title: notificationData.title,
            message: notificationData.message,
            type: notificationType
          },
          { onConflict: 'user_id,type,message,hour_bucket', ignoreDuplicates: true }
        );

    } catch (error) {
      console.error('Error triggering notification:', error);
    }
  }

  private getNotificationContent(type: string): { title: string; message: string } {
    const notifications: Record<string, { title: string; message: string }> = {
      daily_log_reminder: {
        title: "🧾 Daily Log Reminder",
        message: "Your wallet's waiting for your say-so. Quick 5-sec log?"
      },
      streak_protection: {
        title: "🔥 Streak at Risk!",
        message: "Don't let your progress slip away. Log a transaction now to save your streak!"
      },
      budget_breach: {
        title: "🚨 Budget Warning",
        message: "One of your budgets is reaching its limit. Let's check in!"
      },
      weekly_recap: {
        title: "📅 Weekly Wallet Recap",
        message: "Your money told a story this week. Want to hear it?"
      },
      recurring_expense_reminder: {
        title: "💳 Bill Reminder",
        message: "You have a recurring expense coming up soon. Be prepared!"
      },
      monthly_snapshot: {
        title: "📊 Monthly Snapshot",
        message: "Your monthly financial review is ready. How did you do?"
      }
    };

    return notifications[type] || {
      title: "💰 Financial Remark",
      message: "Time for a quick financial check-in!"
    };
  }

  clearSchedule(scheduleKey: string): void {
    const timer = this.activeSchedules.get(scheduleKey);
    if (timer) {
      clearTimeout(timer);
      this.activeSchedules.delete(scheduleKey);
    }
  }

  clearAllSchedules(): void {
    this.activeSchedules.forEach(timer => clearTimeout(timer));
    this.activeSchedules.clear();
  }
}

export const notificationScheduler = NotificationScheduler.getInstance();


import { supabase } from '@/integrations/supabase/client';
import { notificationService } from './notificationService';

export interface NotificationSchedule {
  type: string;
  defaultTime: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'conditional';
}

export const NOTIFICATION_SCHEDULES: NotificationSchedule[] = [
  {
    type: 'daily_log_reminder',
    defaultTime: '19:00', // 7 PM - End of day logging
    description: 'Best time to review and log daily expenses',
    frequency: 'daily'
  },
  {
    type: 'budget_nudges',
    defaultTime: '09:00', // 9 AM - Morning awareness
    description: 'Morning reminder to be mindful of spending',
    frequency: 'conditional'
  },
  {
    type: 'weekly_recap',
    defaultTime: '10:00', // 10 AM Sunday - Weekend review
    description: 'Sunday morning financial review',
    frequency: 'weekly'
  },
  {
    type: 'unusual_activity',
    defaultTime: '20:00', // 8 PM - Evening alert
    description: 'Evening time for reviewing unusual spending',
    frequency: 'conditional'
  },
  {
    type: 'savings_progress',
    defaultTime: '18:00', // 6 PM - Positive evening motivation
    description: 'Evening motivation boost for savings goals',
    frequency: 'conditional'
  },
  {
    type: 'month_reset_preview',
    defaultTime: '11:00', // 11 AM - Late morning preparation
    description: 'Late morning prep for new month budgets',
    frequency: 'monthly'
  },
  {
    type: 'recurring_expense_reminder',
    defaultTime: '08:00', // 8 AM - Morning planning
    description: 'Morning reminder for upcoming bills',
    frequency: 'conditional'
  },
  {
    type: 'night_owl_checkin',
    defaultTime: '23:00', // 11 PM - Late night reflection
    description: 'Late night spending reflection time',
    frequency: 'daily'
  },
  {
    type: 'monthly_snapshot',
    defaultTime: '10:30', // 10:30 AM - Mid-morning review
    description: 'Mid-morning monthly financial review',
    frequency: 'monthly'
  },
  {
    type: 'reflection_prompts',
    defaultTime: '21:00', // 9 PM - Evening reflection
    description: 'Evening time for mindful spending reflection',
    frequency: 'weekly'
  },
  {
    type: 'custom_goal_reminder',
    defaultTime: '17:00', // 5 PM - End of workday motivation
    description: 'End-of-workday goal motivation',
    frequency: 'conditional'
  },
  {
    type: 'business_mode_nudges',
    defaultTime: '16:00', // 4 PM - Late afternoon business check
    description: 'Afternoon business expense review',
    frequency: 'daily'
  },
  {
    type: 'streak_milestone_alerts',
    defaultTime: '12:00', // 12 PM - Midday celebration
    description: 'Midday celebration of achievements',
    frequency: 'conditional'
  },
  {
    type: 'streak_freeze_warnings',
    defaultTime: '18:30', // 6:30 PM - Early evening warning
    description: 'Early evening streak protection reminder',
    frequency: 'conditional'
  },
  {
    type: 'streak_recovery_reminders',
    defaultTime: '15:00', // 3 PM - Afternoon encouragement
    description: 'Afternoon encouragement to restart',
    frequency: 'conditional'
  },
  {
    type: 'streak_breaking_alerts',
    defaultTime: '22:00', // 10 PM - Last chance evening alert
    description: 'Last chance evening streak save reminder',
    frequency: 'conditional'
  }
];

export const getDefaultTimeForNotification = (notificationType: string): string => {
  const schedule = NOTIFICATION_SCHEDULES.find(s => s.type === notificationType);
  return schedule?.defaultTime || '19:00'; // Fallback to 7 PM
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
    // Clear existing schedule
    this.clearSchedule(`${userId}-${notificationType}`);

    if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const scheduleKey = `${userId}-${notificationType}`;
    
    // Calculate next notification time
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
      // Reschedule for next occurrence
      this.scheduleNotification(userId, notificationType, preferredTime, enabled);
    }, msUntil);

    this.activeSchedules.set(scheduleKey, timer);
  }

  private async triggerNotification(userId: string, notificationType: string): Promise<void> {
    try {
      // Get notification content based on type
      const notificationData = this.getNotificationContent(notificationType);
      
      // Send browser notification
      if (Notification.permission === 'granted') {
        new Notification(notificationData.title, {
          body: notificationData.message,
          icon: '/icons/icon-192x192.png'
        });
      }

      // Save to app alerts
      await supabase.from('alerts').insert({
        user_id: userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationType
      });

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
      budget_nudges: {
        title: "🎯 Budget Check-in",
        message: "Starting your day mindfully - how's your budget looking?"
      },
      weekly_recap: {
        title: "📅 Weekly Wallet Recap",
        message: "Your money told a story this week. Want to hear it?"
      },
      night_owl_checkin: {
        title: "🌙 Night Owl Check-in",
        message: "Midnight thoughts? This might be a good time to review your day's spending."
      },
      // Add more notification content as needed
    };

    return notifications[type] || {
      title: "💰 Financial Reminder",
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

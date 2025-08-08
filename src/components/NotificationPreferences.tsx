import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Clock, Smartphone } from "lucide-react";
import { NOTIFICATION_SCHEDULES, getDefaultTimeForNotification, getNotificationDescription, notificationScheduler } from "@/services/notificationScheduler";

interface NotificationPreference {
  id: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  weekly_recap?: boolean;
  budget_nudges?: boolean;
  unusual_activity?: boolean;
  daily_log_reminder?: boolean;
  savings_progress?: boolean;
  month_reset_preview?: boolean;
  recurring_expense_reminder?: boolean;
  night_owl_checkin?: boolean;
  monthly_snapshot?: boolean;
  reflection_prompts?: boolean;
  custom_goal_reminder?: boolean;
  business_mode_nudges?: boolean;
  streak_milestone_alerts?: boolean;
  streak_freeze_warnings?: boolean;
  streak_recovery_reminders?: boolean;
  streak_breaking_alerts?: boolean;
  preferred_time?: string;
  notification_times: Record<string, string>;
}

// Custom Toggle Component
const CustomToggle = ({ 
  checked, 
  onCheckedChange, 
  disabled 
}: { 
  checked: boolean; 
  onCheckedChange: (checked: boolean) => void; 
  disabled?: boolean; 
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${checked ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      style={{ minWidth: '44px', minHeight: '24px' }}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 
          transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
};

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching preferences:', error);
        return;
      }

      let patchedData = data as NotificationPreference | null;

      // Always initialize NOTIFICATION_TIMES for local state/UI, not DB
      const defaultTimes: Record<string, string> = {};
      NOTIFICATION_SCHEDULES.forEach(schedule => {
        defaultTimes[schedule.type] = schedule.defaultTime;
      });

      let notification_times = defaultTimes;
      if (patchedData && 'preferred_time' in patchedData && patchedData.preferred_time) {
        // For backward compatibility, set each time to preferred_time if exists
        Object.keys(notification_times).forEach(type => {
          notification_times[type] = (patchedData as any).preferred_time || defaultTimes[type];
        });
      }

      if (patchedData) {
        setPreferences({ ...patchedData, notification_times });
        // Schedule notifications (notice we pass added notification_times, not from DB)
        scheduleAllNotifications(user.id, { ...patchedData, notification_times });
      } else {
        // Insert without notification_times!
        const { data: newPrefs, error: createError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id, 
            preferred_time: '19:00'
          })
          .select('*')
          .maybeSingle();
        if (createError) {
          console.error('Error creating preferences:', createError);
        } else if (newPrefs) {
          setPreferences({ ...newPrefs, notification_times: defaultTimes });
          scheduleAllNotifications(user.id, { ...newPrefs, notification_times: defaultTimes });
        }
      }
    } catch (error) {
      console.error('Error in fetchPreferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const scheduleAllNotifications = (userId: string, prefs: NotificationPreference) => {
    if (!prefs.notification_times) return;
    
    NOTIFICATION_SCHEDULES.forEach(schedule => {
      const isEnabled = prefs[schedule.type as keyof NotificationPreference] as boolean;
      const preferredTime = prefs.notification_times?.[schedule.type] || schedule.defaultTime;
      
      notificationScheduler.scheduleNotification(
        userId,
        schedule.type,
        preferredTime,
        isEnabled
      );
    });
  };

  const updatePreference = async (key: keyof NotificationPreference, value: boolean | string) => {
    if (!preferences) return;

    setSaving(true);
    try {
      // Only send known fields, never notification_times
      const { error } = await supabase
        .from('notification_preferences')
        .update({ [key]: value })
        .eq('id', preferences.id);

      if (error) throw error;

      const updatedPrefs = { ...preferences, [key]: value };
      setPreferences(updatedPrefs);

      // Reschedule notifications if this was a toggle change
      if (typeof value === 'boolean') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          scheduleAllNotifications(user.id, updatedPrefs);
        }
      }

      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateNotificationTime = async (notificationType: string, time: string) => {
    if (!preferences) return;

    setSaving(true);
    try {
      // Only update UI state, not DB!
      const updatedTimes = {
        ...preferences.notification_times,
        [notificationType]: time
      };
      setPreferences({
        ...preferences,
        notification_times: updatedTimes
      });
      // Reschedule notification (no DB code here)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const isEnabled = preferences[notificationType as keyof NotificationPreference] as boolean;
        notificationScheduler.scheduleNotification(user.id, notificationType, time, isEnabled);
      }
      toast({
        title: "Time updated",
        description: "Notification time has been updated.",
      });
    } catch (error) {
      console.error('Error updating notification time:', error);
      toast({
        title: "Error",
        description: "Failed to update notification time. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Unable to load notification preferences.</p>
          <Button onClick={fetchPreferences} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const notificationOptions = [
    {
      key: 'weekly_recap' as const,
      label: '📅 Weekly Wallet Recap',
      description: 'Get a weekly summary of your financial activity'
    },
    {
      key: 'budget_nudges' as const,
      label: '🎯 Budget Nudges',
      description: 'Gentle reminders when you approach budget limits'
    },
    {
      key: 'unusual_activity' as const,
      label: '💸 Unusual Activity Alerts',
      description: 'Get notified about unexpected spending patterns'
    },
    {
      key: 'daily_log_reminder' as const,
      label: '🧾 Daily Log Reminders',
      description: 'Reminders to log your daily transactions'
    },
    {
      key: 'savings_progress' as const,
      label: '🪙 Savings Progress Updates',
      description: 'Celebrate milestones in your savings goals'
    },
    {
      key: 'month_reset_preview' as const,
      label: '🔄 Month Reset Preview',
      description: 'End-of-month budget review reminders'
    },
    {
      key: 'recurring_expense_reminder' as const,
      label: '🔁 Recurring Expense Reminders',
      description: 'Never miss your recurring bills and payments'
    },
    {
      key: 'night_owl_checkin' as const,
      label: '🌙 Night Owl Check-ins',
      description: 'Late night spending review prompts'
    },
    {
      key: 'monthly_snapshot' as const,
      label: '📈 Monthly Financial Snapshots',
      description: 'Monthly overview of your financial health'
    },
    {
      key: 'reflection_prompts' as const,
      label: '🪞 Reflection Prompts',
      description: 'Mindful spending reflection questions'
    },
    {
      key: 'custom_goal_reminder' as const,
      label: '⚙️ Custom Goal Reminders',
      description: 'Updates on your custom savings goals'
    },
    {
      key: 'business_mode_nudges' as const,
      label: '💼 Business Mode Nudges',
      description: 'Reminders for business expense tracking'
    },
    {
      key: 'streak_milestone_alerts' as const,
      label: '🏆 Streak Milestone Alerts',
      description: 'Celebrate when you reach logging streak milestones'
    },
    {
      key: 'streak_freeze_warnings' as const,
      label: '❄️ Streak Freeze Warnings',
      description: 'Alerts when your streak freeze is about to expire'
    },
    {
      key: 'streak_recovery_reminders' as const,
      label: '🔄 Streak Recovery Reminders',
      description: 'Gentle nudges to help you get back on track'
    },
    {
      key: 'streak_breaking_alerts' as const,
      label: '⚠️ Streak Breaking Alerts',
      description: 'Urgent alerts when your streak is at risk'
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-6">
            {notificationOptions.map((option) => (
              <div key={option.key} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <Label className="text-sm font-medium leading-tight">{option.label}</Label>
                    <p className="text-xs text-muted-foreground leading-tight">{option.description}</p>
                    <p className="text-xs text-blue-600 leading-tight">
                      {getNotificationDescription(option.key)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 mt-1">
                    <CustomToggle
                      checked={preferences[option.key]}
                      onCheckedChange={(checked) => updatePreference(option.key, checked)}
                      disabled={saving}
                    />
                  </div>
                </div>
                
                {preferences[option.key] && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <Label className="text-xs text-muted-foreground">Preferred time:</Label>
                    <Input
                      type="time"
                      value={preferences.notification_times?.[option.key] || getDefaultTimeForNotification(option.key)}
                      onChange={(e) => updateNotificationTime(option.key, e.target.value)}
                      className="w-24 h-7 text-xs"
                      disabled={saving}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-4 w-4" />
              <Label className="text-sm font-medium">Browser Notifications</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Enable browser notifications to receive alerts even when the app is not open.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if ('Notification' in window) {
                  Notification.requestPermission().then((permission) => {
                    toast({
                      title: permission === 'granted' ? "Notifications enabled" : "Notifications blocked",
                      description: permission === 'granted' 
                        ? "You'll now receive browser notifications at your preferred times"
                        : "You can enable notifications in your browser settings"
                    });

                    // Reschedule all notifications if permission was granted
                    if (permission === 'granted' && preferences) {
                      supabase.auth.getUser().then(({ data }) => {
                        if (data && data.user) {
                          scheduleAllNotifications(data.user.id, preferences);
                        }
                      });
                    }
                  });
                }
              }}
            >
              Enable Browser Notifications
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationPreferences;

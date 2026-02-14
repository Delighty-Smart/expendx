import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Clock, Smartphone } from "lucide-react";
import { NOTIFICATION_SCHEDULES, getDefaultTimeForNotification, getNotificationDescription, notificationScheduler } from "@/services/notificationScheduler";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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

  const notificationGroups = [
    {
      title: "Financial Insights",
      options: [
        { key: 'weekly_recap', label: 'Weekly Wallet Recap', description: 'Weekly summary of your financial activity' },
        { key: 'monthly_snapshot', label: 'Monthly Financial Snapshots', description: 'Overview of your monthly financial health' },
        { key: 'reflection_prompts', label: 'Reflection Prompts', description: 'Mindful spending reflection questions' }
      ]
    },
    {
      title: "Reminders & Alerts",
      options: [
        { key: 'daily_log_reminder', label: 'Daily Log Reminders', description: 'Reminders to log your daily transactions' },
        { key: 'budget_nudges', label: 'Budget Nudges', description: 'Alerts when you approach budget limits' },
        { key: 'unusual_activity', label: 'Unusual Activity Alerts', description: 'Alerts for unexpected spending patterns' },
        { key: 'savings_progress', label: 'Savings Progress Updates', description: 'Celebrate milestones in your savings goals' },
        { key: 'recurring_expense_reminder', label: 'Recurring Expense Reminders', description: 'Reminders for recurring bills and payments' },
        { key: 'month_reset_preview', label: 'Month Reset Preview', description: 'End-of-month budget review reminders' },
        { key: 'night_owl_checkin', label: 'Night Owl Check-ins', description: 'Late night spending review prompts' },
        { key: 'custom_goal_reminder', label: 'Custom Goal Reminders', description: 'Updates on your custom savings goals' },
        { key: 'business_mode_nudges', label: 'Business Mode Nudges', description: 'Reminders for business expense tracking' }
      ]
    },
    {
      title: "Streaks & Milestones",
      options: [
        { key: 'streak_milestone_alerts', label: 'Streak Milestone Alerts', description: 'Celebrate logging streak milestones' },
        { key: 'streak_freeze_warnings', label: 'Streak Freeze Warnings', description: 'Alerts when your streak freeze is expiring' },
        { key: 'streak_recovery_reminders', label: 'Streak Recovery Reminders', description: 'Nudges to help you get back on track' },
        { key: 'streak_breaking_alerts', label: 'Streak Breaking Alerts', description: 'Alerts when your streak is at risk' }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-b from-card to-card/50">
        <CardHeader className="bg-primary/5 pb-8">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-xl bg-primary/20 text-primary">
              <Bell className="h-6 w-6" />
            </div>
            Notification Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how and when you want to be notified about your finances.
          </p>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {notificationGroups.map((group) => (
              <div key={group.title} className="p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary/70 mb-4">{group.title}</h3>
                <div className="space-y-3">
                  {group.options.map((option) => (
                    <div
                      key={option.key}
                      className={cn(
                        "group flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl transition-all duration-300",
                        preferences[option.key as keyof NotificationPreference] ? "bg-primary/5 ring-1 ring-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="space-y-1 pr-4 mb-3 sm:mb-0">
                        <Label className="text-sm font-semibold cursor-pointer block">{option.label}</Label>
                        <p className="text-xs text-muted-foreground line-clamp-1 group-hover:line-clamp-none transition-all">
                          {option.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 min-w-[140px]">
                        {preferences[option.key as keyof NotificationPreference] && (
                          <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                            <Clock className="h-3.5 w-3.5 text-primary/60" />
                            <input
                              type="time"
                              value={preferences.notification_times?.[option.key as string] || getDefaultTimeForNotification(option.key as string)}
                              onChange={(e) => updateNotificationTime(option.key as string, e.target.value)}
                              className="bg-transparent border-none text-xs font-medium w-[70px] focus:ring-0 p-0 h-auto cursor-pointer text-primary hover:text-primary/80 transition-colors"
                              disabled={saving}
                            />
                          </div>
                        )}
                        <Switch
                          checked={preferences[option.key as keyof NotificationPreference] as boolean}
                          onCheckedChange={(checked) => updatePreference(option.key as keyof NotificationPreference, checked)}
                          disabled={saving}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-muted/30 border-t border-border/40">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="p-4 rounded-2xl bg-background shadow-sm border border-border/40 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <Label className="text-sm font-bold">Browser Notifications</Label>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  Enable system-level alerts to receive updates even when Expendx is running in the background.
                </p>
              </div>

              <Button
                variant="default"
                className="w-full sm:w-auto h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 transition-transform active:scale-95"
                onClick={() => {
                  if ('Notification' in window) {
                    Notification.requestPermission().then((permission) => {
                      toast({
                        title: permission === 'granted' ? "Notifications enabled" : "Notifications blocked",
                        description: permission === 'granted'
                          ? "You'll now receive browser notifications at your preferred times"
                          : "You can enable notifications in your browser settings"
                      });
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
                Enable Alerts
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationPreferences;


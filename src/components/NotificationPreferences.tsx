import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Clock, Smartphone, AlertTriangle, Award, TrendingUp } from "lucide-react";
import { NOTIFICATION_SCHEDULES, getDefaultTimeForNotification, getNotificationDescription, notificationScheduler } from "@/services/notificationScheduler";
import { notificationService } from "@/services/notificationService";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";
import { MessageReader } from "@solimanware/capacitor-sms-reader";
import { NotificationsListener } from "capacitor-notifications-listener";

interface NotificationPreference {
  id: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  [key: string]: any; // Allow for dynamic fields
}

const CATEGORY_MAPPING: Record<string, { label: string, description: string, fields: string[], icon: any, hasTime?: boolean }> = {
  critical: {
    label: "Critical Alerts",
    description: "Budget breaches and unusual activity alerts",
    fields: ['budget_nudges', 'unusual_activity'],
    icon: AlertTriangle,
    hasTime: false
  },
  consistency: {
    label: "Consistency Nudges",
    description: "Daily reminders and streak protection",
    fields: ['daily_log_reminder', 'streak_milestone_alerts', 'streak_freeze_warnings', 'streak_recovery_reminders', 'streak_breaking_alerts'],
    icon: Award,
    hasTime: true
  },
  bills: {
    label: "Bill Reminders",
    description: "Keep track of upcoming subscriptions and recurring bills",
    fields: ['recurring_expense_reminder'],
    icon: Clock,
    hasTime: false
  },
  growth: {
    label: "Financial Growth Insights",
    description: "Weekly recaps and monthly financial snapshots",
    fields: ['weekly_recap', 'monthly_snapshot', 'reflection_prompts'],
    icon: TrendingUp,
    hasTime: true
  }
};

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPushActive, setIsPushActive] = useState(false);

  const isAndroidDevice = Capacitor.getPlatform() === 'android' || /Android/i.test(navigator.userAgent);

  const [smsGranted, setSmsGranted] = useState(false);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
    checkPushStatus();

    if (isAndroidDevice) {
      checkAndroidPermissions();
    }
  }, []);

  const checkAndroidPermissions = async () => {
    try {
      const smsAuth = await MessageReader.checkPermissions();
      setSmsGranted(smsAuth.sms === 'granted');
    } catch (e) { console.error('SMS permission check failed', e); }

    try {
      // Assuming posx plugin has this 
      const notifAuth = (await NotificationsListener.checkPermissions()) as any;
      if (notifAuth && notifAuth.display === 'granted') setNotificationGranted(true);
    } catch (e) { console.error('Notification permission check failed', e); }
  };

  const checkPushStatus = async () => {
    const subscription = await notificationService.getSubscription();
    setIsPushActive(!!subscription);
  };

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

      if (data) {
        setPreferences(data);
        scheduleAllNotifications(user.id, data);
      } else {
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
          setPreferences(newPrefs);
          scheduleAllNotifications(user.id, newPrefs);
        }
      }
    } catch (error) {
      console.error('Error in fetchPreferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPreferredTimeForCategory = (prefs: NotificationPreference | null, category: string) => {
    if (!prefs?.preferred_time) return "19:00";
    try {
      // Try parsing as JSON first
      const timeObj = JSON.parse(prefs.preferred_time);
      return timeObj[category] || timeObj.default || "19:00";
    } catch {
      // Fallback for legacy simple string format
      return prefs.preferred_time;
    }
  };

  const updatePreferredTime = async (category: string, newTime: string) => {
    if (!preferences) return;

    setSaving(true);
    try {
      let timePreference: Record<string, string> = { default: "19:00" };

      try {
        if (preferences.preferred_time) {
          // If it's already JSON, parse it
          if (preferences.preferred_time.startsWith('{')) {
            timePreference = JSON.parse(preferences.preferred_time);
          } else {
            // If it's a legacy string, use it as default
            timePreference = { default: preferences.preferred_time };
          }
        }
      } catch (e) {
        console.warn("Could not parse existing time preference, starting fresh");
      }

      // Update the specific category
      timePreference[category] = newTime;
      // Also update default if this is the first time setting or broad consistency
      if (category === 'consistency') {
        timePreference.default = newTime;
      }

      const jsonString = JSON.stringify(timePreference);

      const { error } = await supabase
        .from('notification_preferences')
        .update({ preferred_time: jsonString })
        .eq('id', preferences.id);

      if (error) throw error;

      const updatedPrefs = { ...preferences, preferred_time: jsonString };
      setPreferences(updatedPrefs);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        scheduleAllNotifications(user.id, updatedPrefs);
      }

      toast({
        title: "Time updated",
        description: `Notification time for ${CATEGORY_MAPPING[category].label} updated to ${newTime}.`,
      });
    } catch (error) {
      console.error('Error updating time:', error);
      toast({
        title: "Error",
        description: "Failed to update time preference.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const testGlobalNotification = () => {
    notificationService.sendServiceWorkerNotification(
      "Test Notification",
      "This is how your alerts will appear on this device.",
      {
        tag: 'test-global',
        requireInteraction: false
      }
    );
    toast({
      title: "Test sent",
      description: "Check your device for the notification.",
    });
  };

  const scheduleAllNotifications = (userId: string, prefs: NotificationPreference) => {
    NOTIFICATION_SCHEDULES.forEach(schedule => {
      // Map category to enable state
      const isEnabled = prefs[schedule.type as keyof NotificationPreference] ?? prefs[schedule.category] ?? false;
      const categoryTime = getPreferredTimeForCategory(prefs, schedule.category);
      const preferredTime = categoryTime || schedule.defaultTime;

      notificationScheduler.scheduleNotification(
        userId,
        schedule.type,
        preferredTime,
        isEnabled
      );
    });
  };

  const toggleCategory = async (category: string, enabled: boolean) => {
    if (!preferences) return;

    setSaving(true);
    try {
      const fieldsToUpdate: Record<string, boolean> = {};
      const categoryData = CATEGORY_MAPPING[category];

      categoryData.fields.forEach(field => {
        fieldsToUpdate[field] = enabled;
      });

      const { error } = await supabase
        .from('notification_preferences')
        .update(fieldsToUpdate)
        .eq('id', preferences.id);

      if (error) throw error;

      const updatedPrefs = { ...preferences, ...fieldsToUpdate };
      setPreferences(updatedPrefs);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        scheduleAllNotifications(user.id, updatedPrefs);
      }

      toast({
        title: "Preferences updated",
        description: `${categoryData.label} have been ${enabled ? 'enabled' : 'disabled'}.`,
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-b from-card to-card/50">
        <CardHeader className="bg-primary/5 pb-8">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-primary/20 text-primary">
              <Bell className="h-6 w-6" />
            </div>
            Smart Notifications
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Focus on what matters. We've simplified notifications to keep you informed without the noise.
          </p>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid gap-4">
            {Object.entries(CATEGORY_MAPPING).map(([key, config]) => {
              const Icon = config.icon;
              // Category is "enabled" if at least one of its primary fields is enabled
              const isEnabled = preferences?.[config.fields[0]] ?? false;
              const preferredTime = getPreferredTimeForCategory(preferences, key);

              return (
                <div
                  key={key}
                  className={cn(
                    "group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg transition-all duration-300 border",
                    isEnabled ? "bg-primary/5 border-primary/20" : "bg-card border-border/50 hover:border-border"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-lg transition-colors",
                    isEnabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-bold cursor-pointer">{config.label}</Label>
                      {isEnabled && <Badge variant="secondary" className="text-[10px] h-4 uppercase tracking-wider font-bold">Active</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug">
                      {config.description}
                    </p>

                    {/* Time Picker for supported categories */}
                    {config.hasTime && isEnabled && (
                      <div className="flex items-center gap-2 mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <Label htmlFor={`time-${key}`} className="text-xs font-medium text-muted-foreground">
                          Preferred Time:
                        </Label>
                        <div className="relative">
                          <input
                            id={`time-${key}`}
                            type="time"
                            value={preferredTime}
                            onChange={(e) => updatePreferredTime(key, e.target.value)}
                            className="bg-background border border-input rounded-md px-2 py-1 text-xs h-7 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            disabled={saving}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                    <div className="flex-1 sm:flex-initial flex justify-end">
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => toggleCategory(key, checked)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-6 rounded-lg bg-muted/30 border border-dashed border-border flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="p-3 rounded-lg bg-background shadow-sm border border-border/50">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-bold">Ready for Device Alerts?</h4>
              <p className="text-xs text-muted-foreground">
                Make sure you've granted browser permission to receive these notifications on your device.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={testGlobalNotification}
              >
                Test Alerts
              </Button>
              <Button
                variant="default"
                size="sm"
                className={cn(
                  "w-full sm:w-auto rounded-lg shadow-lg",
                  isPushActive ? "bg-green-600 hover:bg-green-700 shadow-green-900/20" : "shadow-primary/20"
                )}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const success = await notificationService.subscribeToPush();
                    if (success) {
                      setIsPushActive(true);
                      toast({
                        title: "Push Alerts Active",
                        description: "You'll now receive background alerts even when the app is closed.",
                      });
                    } else {
                      toast({
                        title: "Setup Failed",
                        description: "Could not enable push notifications. Check browser permissions.",
                        variant: "destructive"
                      });
                    }
                  } catch (err) {
                    console.error('Push setup error:', err);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {isPushActive ? "Alerts Active ✅" : "Enable Device Alerts"}
              </Button>
            </div>
          </div>

          {isAndroidDevice && (
            <div className="mt-6 p-6 rounded-lg bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="p-3 rounded-lg bg-background shadow-sm border border-border/50">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-sm font-bold">Auto-Track Bank Transactions</h4>
                <p className="text-xs text-muted-foreground">
                  Read SMS and Bank App notifications to automatically log transactions. Android only.
                </p>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("w-full sm:w-auto", smsGranted ? "bg-green-600/10 text-green-600 border-green-600/30" : "")}
                  onClick={async () => {
                    try {
                      if (!isAndroidDevice) {
                        toast({ title: "Android Only", description: "SMS tracking is only supported on Android devices.", variant: "destructive" });
                        return;
                      }

                      const res = await MessageReader.requestPermissions();
                      if (res.sms === 'granted') {
                        setSmsGranted(true);
                        toast({ title: "SMS Access Granted", description: "expendX will auto-track bank SMS messages based on specific formats." });
                      } else {
                        toast({ title: "Permission Denied", description: "Please allow SMS permissions in your device settings.", variant: "destructive" });
                      }
                    } catch (e) {
                      console.error(e);
                      toast({ title: "Error", description: "Failed to request SMS tracking permissions.", variant: "destructive" });
                    }
                  }}
                >
                  {smsGranted ? "SMS Active ✅" : "Track SMS"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("w-full sm:w-auto", notificationGranted ? "bg-green-600/10 text-green-600 border-green-600/30" : "")}
                  onClick={async () => {
                    try {
                      if (!isAndroidDevice) {
                        toast({ title: "Android Only", description: "App Alert tracking is only supported on Android devices.", variant: "destructive" });
                        return;
                      }

                      const notifAuth = (await NotificationsListener.requestPermission()) as any;
                      if (notifAuth && notifAuth.display === 'granted') {
                        setNotificationGranted(true);
                        toast({ title: "Notification Access Granted", description: "expendX will auto-track bank push alerts based on specific formats." });
                      } else {
                        toast({ title: "Permission Denied", description: "Please allow Notification Access in your device settings.", variant: "destructive" });
                      }
                    } catch (e) {
                      console.error(e);
                      toast({ title: "Error", description: "Failed to request App Alert tracking permissions.", variant: "destructive" });
                    }
                  }}
                >
                  {notificationGranted ? "App Alerts Active ✅" : "Track App Alerts"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationPreferences;

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Clock, Smartphone, AlertTriangle, Award, TrendingUp, Info } from "lucide-react";
import { NOTIFICATION_SCHEDULES, getDefaultTimeForNotification, getNotificationDescription, notificationScheduler } from "@/services/notificationScheduler";
import { notificationService } from "@/services/notificationService";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();

  const isAndroidDevice = Capacitor.getPlatform() === 'android' || /Android/i.test(navigator.userAgent);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    const subscription = await notificationService.getSubscription();
    setIsPushActive(!!subscription);
  };

  const fetchPreferences = async () => {
    try {
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
      const timeObj = JSON.parse(prefs.preferred_time);
      return timeObj[category] || timeObj.default || "19:00";
    } catch {
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
          if (preferences.preferred_time.startsWith('{')) {
            timePreference = JSON.parse(preferences.preferred_time);
          } else {
            timePreference = { default: preferences.preferred_time };
          }
        }
      } catch (e) {
        console.warn("Could not parse existing time preference");
      }
      timePreference[category] = newTime;
      if (category === 'consistency') timePreference.default = newTime;
      const jsonString = JSON.stringify(timePreference);
      const { error } = await supabase
        .from('notification_preferences')
        .update({ preferred_time: jsonString })
        .eq('id', preferences.id);

      if (error) throw error;
      const updatedPrefs = { ...preferences, preferred_time: jsonString };
      setPreferences(updatedPrefs);
      if (user) scheduleAllNotifications(user.id, updatedPrefs);
      toast({ title: "Time updated", description: `Notification time updated to ${newTime}.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update time.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const scheduleAllNotifications = (userId: string, prefs: NotificationPreference) => {
    NOTIFICATION_SCHEDULES.forEach(schedule => {
      const isEnabled = prefs[schedule.type as keyof NotificationPreference] ?? prefs[schedule.category] ?? false;
      const categoryTime = getPreferredTimeForCategory(prefs, schedule.category);
      const preferredTime = categoryTime || schedule.defaultTime;
      notificationScheduler.scheduleNotification(userId, schedule.type, preferredTime, isEnabled);
    });
  };

  const toggleCategory = async (category: string, enabled: boolean) => {
    if (!preferences) return;
    setSaving(true);
    try {
      const fieldsToUpdate: Record<string, boolean> = {};
      const categoryData = CATEGORY_MAPPING[category];
      categoryData.fields.forEach(field => { fieldsToUpdate[field] = enabled; });
      const { error } = await supabase
        .from('notification_preferences')
        .update(fieldsToUpdate)
        .eq('id', preferences.id);
      if (error) throw error;
      const updatedPrefs = { ...preferences, ...fieldsToUpdate };
      setPreferences(updatedPrefs);
      if (user) scheduleAllNotifications(user.id, updatedPrefs);
      toast({ title: "Preferences updated", description: `${categoryData.label} ${enabled ? 'enabled' : 'disabled'}.` });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Smart Alert Channels</Label>
          <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary">AI Configured</Badge>
        </div>

        <div className="space-y-3">
          {Object.entries(CATEGORY_MAPPING).map(([key, config]) => {
            const Icon = config.icon;
            const isEnabled = preferences?.[config.fields[0]] ?? false;
            const preferredTime = getPreferredTimeForCategory(preferences, key);

            return (
              <div
                key={key}
                className={cn(
                  "relative flex flex-col gap-3 p-4 rounded-2xl transition-all duration-300 border backdrop-blur-sm",
                  isEnabled
                    ? "bg-primary/5 border-primary/20 shadow-lg shadow-primary/5"
                    : "bg-background/40 border-border/50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2.5 rounded-xl transition-colors duration-300",
                    isEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <Label className="text-sm font-bold block truncate">{config.label}</Label>
                    <p className="text-[11px] text-muted-foreground leading-tight">{config.description}</p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => toggleCategory(key, checked)}
                    disabled={saving}
                    className="data-[state=on]:bg-primary"
                  />
                </div>
                {config.hasTime && isEnabled && (
                  <div className="flex items-center justify-between pt-3 border-t border-primary/10 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label htmlFor={`time-${key}`} className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Scheduled for
                    </Label>
                    <input
                      id={`time-${key}`}
                      type="time"
                      value={preferredTime}
                      onChange={(e) => updatePreferredTime(key, e.target.value)}
                      className="bg-primary/10 border-none rounded-lg px-3 py-1 text-xs font-bold text-primary focus:ring-0 w-24 h-8"
                      disabled={saving}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground px-1">Device Integration</Label>
        <div className="grid gap-3">
          <div className={cn(
            "group flex flex-col gap-4 p-4 rounded-2xl border transition-all duration-300",
            isPushActive ? "bg-green-500/5 border-green-500/20" : "bg-background/40 border-border/50"
          )}>
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-2.5 rounded-xl transition-colors",
                isPushActive ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
              )}>
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold">Push Alerts</div>
                <div className="text-[10px] text-muted-foreground">Budget & Streak reminders</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={isPushActive ? "default" : "secondary"}
                  size="sm"
                  className={cn(
                    "rounded-full text-[10px] font-bold h-7 px-4",
                    isPushActive ? "bg-green-600 hover:bg-green-700 text-white" : ""
                  )}
                  onClick={async () => {
                    if (isPushActive) return;
                    setSaving(true);
                    try {
                      const success = await notificationService.subscribeToPush();
                      if (success) {
                        setIsPushActive(true);
                        toast({ title: "Push enabled", description: "You will now receive automatic platform alerts." });
                      }
                    } finally { setSaving(false); }
                  }}
                >
                  {isPushActive ? "Active ✅" : "Enable"}
                </Button>
                {isPushActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-[10px] font-bold h-7 px-3 border-green-500/30 text-green-600 hover:bg-green-500/10"
                    onClick={() => {
                      notificationService.sendServiceWorkerNotification(
                        "Test Configured! 🎉",
                        "Your push alerts are working perfectly.",
                        { requireInteraction: true }
                      );
                      toast({ title: "Test sent", description: "Check your device notifications." });
                    }}
                  >
                    Test Alert
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAndroidDevice && (
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white">
              <Info className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold">Auto-Ledger Update</h4>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Direct SMS/App tracking is currently suspended to ensure maximum stability on Android 13+.
                <br /><br />
                <span className="font-bold text-amber-600">Pro-Tip:</span> You can now <strong>"Share"</strong> bank receipts directly to Expendx to log them instantly!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPreferences;

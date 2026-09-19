import React, { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Bell, Clock, Smartphone, AlertTriangle, Award, TrendingUp, LucideIcon } from "lucide-react";
import { NOTIFICATION_SCHEDULES, notificationScheduler } from "@/services/notificationScheduler";
import { notificationService } from "@/services/notificationService";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface NotificationPreference {
  id: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  preferred_time: string | null;
  [key: string]: string | boolean | null | undefined;
}

const CATEGORY_MAPPING: Record<string, { label: string, description: string, fields: string[], icon: LucideIcon, hasTime?: boolean }> = {
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
  const { toast } = useToast();

  const getPreferredTimeForCategory = useCallback((prefs: NotificationPreference | null, category: string) => {
    if (!prefs?.preferred_time) return "19:00";
    try {
      const timeObj = JSON.parse(prefs.preferred_time);
      return timeObj[category] || timeObj.default || "19:00";
    } catch {
      return prefs.preferred_time;
    }
  }, []);

  const scheduleAllNotifications = useCallback((userId: string, prefs: NotificationPreference) => {
    NOTIFICATION_SCHEDULES.forEach(schedule => {
      const isEnabled = (prefs[schedule.type as keyof NotificationPreference] ?? prefs[schedule.category] ?? false) === true;
      const categoryTime = getPreferredTimeForCategory(prefs, schedule.category);
      const preferredTime = categoryTime || schedule.defaultTime;
      notificationScheduler.scheduleNotification(userId, schedule.type, preferredTime, isEnabled);
    });
  }, [getPreferredTimeForCategory]);

  useEffect(() => {
    const checkPushStatus = async () => {
      const subscription = await notificationService.getSubscription();
      setIsPushActive(!!subscription);
    };

    const fetchPreferences = async () => {
      try {
        if (!user) return;

        const docRef = doc(db, 'notification_preferences', user.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as NotificationPreference;
          setPreferences(data);
          scheduleAllNotifications(user.id, data);
        } else {
          const newPrefs: NotificationPreference = {
            id: user.id,
            user_id: user.id,
            preferred_time: '19:00',
            created_at: new Date().toISOString()
          };
          await setDoc(docRef, newPrefs);
          setPreferences(newPrefs);
          scheduleAllNotifications(user.id, newPrefs);
        }
      } catch (error) {
        console.error('Error in fetchPreferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
    checkPushStatus();
  }, [user, scheduleAllNotifications]);

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

      await updateDoc(doc(db, 'notification_preferences', preferences.id), {
        preferred_time: jsonString,
        updated_at: new Date().toISOString()
      });

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

  const toggleCategory = async (category: string, enabled: boolean) => {
    if (!preferences) return;
    setSaving(true);
    try {
      const fieldsToUpdate: Record<string, boolean> = {};
      const categoryData = CATEGORY_MAPPING[category];
      categoryData.fields.forEach(field => { fieldsToUpdate[field] = enabled; });

      await updateDoc(doc(db, 'notification_preferences', preferences.id), {
        ...fieldsToUpdate,
        updated_at: new Date().toISOString()
      });

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
            const isEnabled = preferences?.[config.fields[0]] === true;
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
                      className="bg-input border border-border-default rounded-xl px-3 py-1.5 text-xs font-bold text-text-primary focus:ring-0 w-28 h-8"
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

    </div>
  );
};

export default NotificationPreferences;

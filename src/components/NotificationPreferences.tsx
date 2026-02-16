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

interface NotificationPreference {
  id: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  [key: string]: any; // Allow for dynamic fields
}

const CATEGORY_MAPPING: Record<string, { label: string, description: string, fields: string[], icon: any }> = {
  critical: {
    label: "Critical Alerts",
    description: "Budget breaches and unusual activity alerts",
    fields: ['budget_nudges', 'unusual_activity'],
    icon: AlertTriangle
  },
  consistency: {
    label: "Consistency Nudges",
    description: "Daily reminders and streak protection",
    fields: ['daily_log_reminder', 'streak_milestone_alerts', 'streak_freeze_warnings', 'streak_recovery_reminders', 'streak_breaking_alerts'],
    icon: Award
  },
  bills: {
    label: "Bill Reminders",
    description: "Keep track of upcoming subscriptions and recurring bills",
    fields: ['recurring_expense_reminder'],
    icon: Clock
  },
  growth: {
    label: "Financial Growth Insights",
    description: "Weekly recaps and monthly financial snapshots",
    fields: ['weekly_recap', 'monthly_snapshot', 'reflection_prompts'],
    icon: TrendingUp
  }
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

  const scheduleAllNotifications = (userId: string, prefs: NotificationPreference) => {
    NOTIFICATION_SCHEDULES.forEach(schedule => {
      // Map category to enable state
      const isEnabled = prefs[schedule.type as keyof NotificationPreference] ?? prefs[schedule.category] ?? false;
      const preferredTime = prefs.preferred_time || schedule.defaultTime;

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

  const testNotification = (category: string) => {
    const config = CATEGORY_MAPPING[category];
    notificationService.sendServiceWorkerNotification(
      `Test: ${config.label}`,
      `This is how you'll receive your ${config.label.toLowerCase()}.`,
      {
        tag: `test-${category}`,
        requireInteraction: category === 'critical'
      }
    );
    toast({
      title: "Test sent",
      description: "Check your device for the notification.",
    });
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
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => testNotification(key)}
                    >
                      Test
                    </Button>
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
            <Button
              variant="default"
              size="sm"
              className="w-full sm:w-auto rounded-lg shadow-lg shadow-primary/20"
              onClick={() => {
                notificationService.requestPermission().then(granted => {
                  toast({
                    title: granted ? "Permission Granted" : "Permission Denied",
                    description: granted ? "You're all set to receive smart alerts." : "Please enable notifications in your browser settings.",
                    variant: granted ? "default" : "destructive"
                  });
                });
              }}
            >
              Enable Device Alerts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationPreferences;


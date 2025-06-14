import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Clock, Smartphone, Check } from "lucide-react";

interface NotificationPreference {
  id: string;
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
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching preferences:', error);
        return;
      }

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences if none exist
        const { data: newPrefs, error: createError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select('*')
          .single();

        if (createError) {
          console.error('Error creating preferences:', createError);
        } else {
          setPreferences(newPrefs);
        }
      }
    } catch (error) {
      console.error('Error in fetchPreferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreference, value: boolean | string) => {
    if (!preferences) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ [key]: value })
        .eq('id', preferences.id);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, [key]: value } : null);
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
          <div className="space-y-4">
            {notificationOptions.map((option) => (
              <div key={option.key} className="flex items-center justify-between py-2">
                <div className="space-y-1 flex-1">
                  <Label className="text-sm font-medium">{option.label}</Label>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                <Toggle
                  pressed={preferences[option.key]}
                  onPressedChange={(pressed) => updatePreference(option.key, pressed)}
                  disabled={saving}
                  className="ml-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  aria-label={`Toggle ${option.label}`}
                >
                  <Check className="h-4 w-4" />
                </Toggle>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              <Label className="text-sm font-medium">Preferred Notification Time</Label>
            </div>
            <Input
              type="time"
              value={preferences.preferred_time}
              onChange={(e) => updatePreference('preferred_time', e.target.value)}
              className="w-40"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Time for scheduled notifications (like night owl check-ins)
            </p>
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
                        ? "You'll now receive browser notifications"
                        : "You can enable notifications in your browser settings"
                    });
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


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { notificationManager, NotificationPreferences } from '@/services/notificationManager';
import { Bell, Clock, Target, TrendingUp, Calendar, Moon, BarChart3, MessageCircle, Goal, Briefcase } from 'lucide-react';

interface NotificationPreferencesProps {
  userId: string;
}

const NotificationPreferencesComponent: React.FC<NotificationPreferencesProps> = ({ userId }) => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const prefs = await notificationManager.getPreferences(userId);
      setPreferences(prefs || {
        user_id: userId,
        weekly_recap: true,
        budget_nudges: true,
        unusual_activity: true,
        daily_log_reminder: true,
        savings_progress: true,
        month_reset_preview: true,
        recurring_expense_reminder: true,
        night_owl_checkin: false,
        monthly_snapshot: true,
        reflection_prompts: false,
        custom_goal_reminder: true,
        business_mode_nudges: false,
        preferred_time: '20:00:00'
      });
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean | string) => {
    if (!preferences) return;
    
    setPreferences({
      ...preferences,
      [key]: value
    });
  };

  const savePreferences = async () => {
    if (!preferences) return;
    
    setSaving(true);
    try {
      const success = await notificationManager.updatePreferences(userId, preferences);
      if (success) {
        toast({
          title: "Success",
          description: "Notification preferences updated"
        });
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !preferences) {
    return <div className="animate-pulse">Loading preferences...</div>;
  }

  const notificationTypes = [
    {
      key: 'weekly_recap' as keyof NotificationPreferences,
      title: '📅 Weekly Wallet Recap',
      description: 'Sunday evening summary of your financial week',
      icon: <Calendar className="h-4 w-4" />
    },
    {
      key: 'budget_nudges' as keyof NotificationPreferences,
      title: '🎯 Budget Nudges',
      description: 'Friendly alerts when approaching budget limits',
      icon: <Target className="h-4 w-4" />
    },
    {
      key: 'unusual_activity' as keyof NotificationPreferences,
      title: '💸 Unusual Activity Alert',
      description: 'Notifications for spending pattern changes',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      key: 'daily_log_reminder' as keyof NotificationPreferences,
      title: '🧾 Daily Log Reminder',
      description: 'Gentle reminder when no transactions logged',
      icon: <Bell className="h-4 w-4" />
    },
    {
      key: 'savings_progress' as keyof NotificationPreferences,
      title: '🪙 Savings Progress Spark',
      description: 'Celebrate milestones toward your goals',
      icon: <Goal className="h-4 w-4" />
    },
    {
      key: 'month_reset_preview' as keyof NotificationPreferences,
      title: '🔄 End-of-Month Reset Preview',
      description: 'Budget review reminder before new month',
      icon: <Calendar className="h-4 w-4" />
    },
    {
      key: 'recurring_expense_reminder' as keyof NotificationPreferences,
      title: '🔁 Recurring Expense Reminder',
      description: 'Heads up for upcoming bills and subscriptions',
      icon: <Bell className="h-4 w-4" />
    },
    {
      key: 'night_owl_checkin' as keyof NotificationPreferences,
      title: '🌙 Night Owl Check-in',
      description: 'Late night spending review prompts',
      icon: <Moon className="h-4 w-4" />
    },
    {
      key: 'monthly_snapshot' as keyof NotificationPreferences,
      title: '📈 Monthly Financial Snapshot',
      description: 'Month-end performance summary with graphs',
      icon: <BarChart3 className="h-4 w-4" />
    },
    {
      key: 'reflection_prompts' as keyof NotificationPreferences,
      title: '🪞 Reflection Prompts',
      description: 'Mindfulness questions about spending habits',
      icon: <MessageCircle className="h-4 w-4" />
    },
    {
      key: 'custom_goal_reminder' as keyof NotificationPreferences,
      title: '⚙️ Custom Goal Reminder',
      description: 'Updates on your personal savings goals',
      icon: <Target className="h-4 w-4" />
    },
    {
      key: 'business_mode_nudges' as keyof NotificationPreferences,
      title: '💼 Business Mode Nudges',
      description: 'Side hustle and business expense tracking',
      icon: <Briefcase className="h-4 w-4" />
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {notificationTypes.map((type) => (
            <div key={type.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-start gap-3">
                <div className="mt-1 text-muted-foreground">
                  {type.icon}
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium leading-none">
                    {type.title}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {type.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={Boolean(preferences[type.key])}
                onCheckedChange={(checked) => updatePreference(type.key, checked)}
              />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Preferred Notification Time
          </Label>
          <Select
            value={preferences.preferred_time}
            onValueChange={(value) => updatePreference('preferred_time', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="08:00:00">8:00 AM</SelectItem>
              <SelectItem value="12:00:00">12:00 PM</SelectItem>
              <SelectItem value="17:00:00">5:00 PM</SelectItem>
              <SelectItem value="20:00:00">8:00 PM</SelectItem>
              <SelectItem value="22:00:00">10:00 PM</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={savePreferences} 
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferencesComponent;

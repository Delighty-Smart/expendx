
-- Add streak-related notification preferences to the notification_preferences table
ALTER TABLE notification_preferences 
ADD COLUMN streak_milestone_alerts boolean DEFAULT true,
ADD COLUMN streak_freeze_warnings boolean DEFAULT true,
ADD COLUMN streak_recovery_reminders boolean DEFAULT true,
ADD COLUMN streak_breaking_alerts boolean DEFAULT false;

-- Update existing records to have the new default values
UPDATE notification_preferences 
SET 
  streak_milestone_alerts = true,
  streak_freeze_warnings = true, 
  streak_recovery_reminders = true,
  streak_breaking_alerts = false
WHERE streak_milestone_alerts IS NULL;

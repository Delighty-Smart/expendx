import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/ui/page-header";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Check, CheckCheck, AlertTriangle, User, DollarSign, Award, Calendar, Target, TrendingUp, Clock, Moon, BarChart, MessageSquare, Settings, Briefcase, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";

type Alert = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean | null;
  created_at: string | null;
  related_id: string | null;
  user_id: string;
};

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Note: We rely on Layout.tsx for realtime alerts updates to avoid duplicate subscriptions

  // Set up real-time alerts refresh via window events (from Layout.tsx)
  useEffect(() => {
    const handleAlertsUpdate = () => {
      console.log("Alerts updated via window event, refreshing list");
      fetchAlerts();
    };

    window.addEventListener('alerts-updated', handleAlertsUpdate);
    return () => {
      window.removeEventListener('alerts-updated', handleAlertsUpdate);
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "SIGNED_IN" && session) {
          setIsAuthenticated(true);
          fetchAlerts();
        } else if (event === "SIGNED_OUT") {
          setIsAuthenticated(false);
          navigate('/auth');
        }
      }
    );

    // Check if user is already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        fetchAlerts();
      } else {
        setIsAuthenticated(false);
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAuthenticated(false);
        navigate('/auth');
        return;
      }

      // Get all alerts for the current user
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error",
        description: "Could not load alerts. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ read: true })
        .eq('id', alertId);

      if (error) throw error;

      // Update local state

      setAlerts(alerts.map(alert =>

        alert.id === alertId ? { ...alert, read: true } : alert
      ));

      toast({
        title: "Success",
        description: "Alert marked as read",
      });
    } catch (error) {
      console.error('Error marking alert as read:', error);
      toast({
        title: "Error",
        description: "Could not update alert. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadAlertIds = alerts
        .filter(alert => !alert.read)
        .map(alert => alert.id);

      if (unreadAlertIds.length === 0) {
        toast({
          title: "Info",
          description: "No unread alerts to mark",
        });
        return;
      }

      const { error } = await supabase
        .from('alerts')
        .update({ read: true })
        .in('id', unreadAlertIds);

      if (error) throw error;

      // Update local state
      setAlerts(alerts.map(alert => ({ ...alert, read: true })));

      toast({
        title: "Success",
        description: "All alerts marked as read",
      });
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
      toast({
        title: "Error",
        description: "Could not update alerts. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSelectAlert = (alertId: string, checked: boolean) => {
    const newSelected = new Set(selectedAlerts);
    if (checked) {
      newSelected.add(alertId);
    } else {
      newSelected.delete(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAlerts(new Set(alerts.map(alert => alert.id)));
    } else {
      setSelectedAlerts(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedAlerts.size === 0) {
      toast({
        title: "Info",
        description: "No alerts selected for deletion",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .in('id', Array.from(selectedAlerts));

      if (error) throw error;

      // Update local state
      setAlerts(alerts.filter(alert => !selectedAlerts.has(alert.id)));
      setSelectedAlerts(new Set());

      toast({
        title: "Success",
        description: `${selectedAlerts.size} alert(s) deleted`,
      });
    } catch (error) {
      console.error('Error deleting alerts:', error);
      toast({
        title: "Error",
        description: "Could not delete alerts. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Exit selection mode, clear selected items
      setSelectedAlerts(new Set());
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'weekly_recap':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'budget_nudges':
        return <Target className="h-5 w-5 text-yellow-500" />;
      case 'unusual_activity':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'daily_log_reminder':
        return <Bell className="h-5 w-5 text-purple-500" />;
      case 'savings_progress':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'month_reset_preview':
        return <Calendar className="h-5 w-5 text-orange-500" />;
      case 'recurring_expense_reminder':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'night_owl_checkin':
        return <Moon className="h-5 w-5 text-indigo-500" />;
      case 'monthly_snapshot':
        return <BarChart className="h-5 w-5 text-emerald-500" />;
      case 'reflection_prompts':
        return <MessageSquare className="h-5 w-5 text-pink-500" />;
      case 'custom_goal_reminder':
        return <Settings className="h-5 w-5 text-gray-500" />;
      case 'business_mode_nudges':
        return <Briefcase className="h-5 w-5 text-slate-600" />;
      case 'budget_alert':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'system':
        return <Bell className="h-5 w-5 text-blue-500" />;
      case 'feedback_response':
        return <CheckCheck className="h-5 w-5 text-green-500" />;
      case 'admin_message':
        return <User className="h-5 w-5 text-purple-500" />;
      case 'streak':
        return <Award className="h-5 w-5 text-emerald-500" />;
      case 'payment':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'budget_alert':
      case 'budget_nudges':
      case 'unusual_activity':
        return "destructive";
      case 'system':
      case 'weekly_recap':
      case 'daily_log_reminder':
        return "default";
      case 'feedback_response':
      case 'savings_progress':
      case 'monthly_snapshot':
        return "secondary";
      case 'streak':
      case 'reflection_prompts':
      case 'custom_goal_reminder':
        return "outline";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';


    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',

      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const allSelected = alerts.length > 0 && selectedAlerts.size === alerts.length;
  const someSelected = selectedAlerts.size > 0;

  return (
    <div className="container mx-auto p-4">
      <PageHeader
        className="mb-6"
        title="Alerts & Notifications"
        actions={
          <>
            {selectionMode ? (
              <>
                {someSelected && (

                  <Button
                    variant="destructive"

                    onClick={handleDeleteSelected}
                    className="flex items-center gap-2 flex-none whitespace-nowrap"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Selected ({selectedAlerts.size})
                  </Button>
                )}

                <Button
                  variant="outline"

                  onClick={toggleSelectionMode}
                  className="flex items-center gap-2 flex-none whitespace-nowrap"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {alerts.length > 0 && (

                  <Button
                    variant="outline"

                    onClick={toggleSelectionMode}
                    className="flex-none whitespace-nowrap"
                  >
                    Select
                  </Button>
                )}

                <Button
                  variant="outline"

                  onClick={handleMarkAllAsRead}
                  disabled={alerts.every(alert => alert.read) || alerts.length === 0}
                  className="flex-none whitespace-nowrap"
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  <span>Mark All as Read</span>
                </Button>
              </>
            )}
          </>
        }
      />

      {selectionMode && alerts.length > 0 && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              size="sm"
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              className="rounded-full data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground flex-shrink-0"
            />
            <span className="text-sm font-medium">

              {allSelected ? 'Deselect All' : 'Select All'}

              {someSelected && !allSelected && ` (${selectedAlerts.size} selected)`}
            </span>
          </div>
        </div>
      )}



      {loading ? (
        <div className="space-y-4 animate-skeleton-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-5 h-5 bg-muted rounded"></div>
                <div className="h-5 bg-muted rounded flex-1"></div>
                <div className="h-6 w-20 bg-muted rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="h-5 w-16 bg-muted rounded"></div>
                <div className="h-4 w-24 bg-muted rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => (

            <Card
              key={alert.id}
              className={`transition-all duration-300 hover:shadow-md ${!alert.read ? 'border-l-4 border-l-primary bg-primary/5' : 'bg-card/50'}`}
            >
              {/* Header with Checkbox (if in selection mode), Icon and Title */}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">

                  {selectionMode && (
                    <Checkbox
                      size="sm"
                      checked={selectedAlerts.has(alert.id)}
                      onCheckedChange={(checked) => handleSelectAlert(alert.id, checked as boolean)}
                      className="rounded-full data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground flex-shrink-0"
                    />
                  )}
                  <div className="flex-shrink-0">
                    {getAlertIcon(alert.type)}
                  </div>

                  <CardTitle className="text-lg font-semibold flex-1 min-w-0 leading-tight">

                    {alert.title}
                  </CardTitle>
                  {!alert.read && (
                    <div className="ml-auto flex-shrink-0">

                      <Button
                        variant="ghost"

                        size="sm"
                        onClick={() => handleMarkAsRead(alert.id)}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark Read
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              {/* Message Content */}
              <CardContent className="py-0">
                <p className="text-muted-foreground leading-relaxed">
                  {alert.message}
                </p>
              </CardContent>

              {/* Footer with Badge and Date */}
              <CardFooter className="pt-4 pb-4">
                <div className="flex items-center justify-between w-full">
                  <Badge variant={getAlertBadgeVariant(alert.type)} className="text-xs">
                    {alert.type.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(alert.created_at)}
                  </span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No alerts</h3>
            <p className="text-muted-foreground">
              You don't have any notifications or alerts at this time.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Alerts;



import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, AlertTriangle, User, DollarSign, Award, Calendar, Target, TrendingUp, Clock, Moon, BarChart, Mirror, Settings, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

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
  const navigate = useNavigate();
  const { toast } = useToast();

  // Set up realtime subscription to alerts
  useRealtimeSubscription('alerts', '*', () => {
    console.log("Alerts updated, refreshing list");
    fetchAlerts();
  });

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

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'weekly_recap':
        return <Calendar className="text-blue-500" />;
      case 'budget_nudges':
        return <Target className="text-yellow-500" />;
      case 'unusual_activity':
        return <AlertTriangle className="text-red-500" />;
      case 'daily_log_reminder':
        return <Bell className="text-purple-500" />;
      case 'savings_progress':
        return <TrendingUp className="text-green-500" />;
      case 'month_reset_preview':
        return <Calendar className="text-orange-500" />;
      case 'recurring_expense_reminder':
        return <Clock className="text-blue-600" />;
      case 'night_owl_checkin':
        return <Moon className="text-indigo-500" />;
      case 'monthly_snapshot':
        return <BarChart className="text-emerald-500" />;
      case 'reflection_prompts':
        return <Mirror className="text-pink-500" />;
      case 'custom_goal_reminder':
        return <Settings className="text-gray-500" />;
      case 'business_mode_nudges':
        return <Briefcase className="text-slate-600" />;
      case 'budget_alert':
        return <AlertTriangle className="text-yellow-500" />;
      case 'system':
        return <Bell className="text-blue-500" />;
      case 'feedback_response':
        return <CheckCheck className="text-green-500" />;
      case 'admin_message':
        return <User className="text-purple-500" />;
      case 'streak':
        return <Award className="text-emerald-500" />;
      case 'payment':
        return <DollarSign className="text-green-500" />;
      default:
        return <Bell className="text-blue-500" />;
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
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Alerts & Notifications</h1>
          
          <Button 
            variant="outline" 
            onClick={handleMarkAllAsRead}
            disabled={alerts.every(alert => alert.read) || alerts.length === 0}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            <span>Mark All as Read</span>
          </Button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading alerts...</div>
          </div>
        ) : alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className={`overflow-hidden transition-all ${!alert.read ? 'border-l-4 border-l-primary' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        {getAlertIcon(alert.type)}
                      </div>
                      <CardTitle className="text-lg">
                        {alert.title}
                      </CardTitle>
                      <Badge variant={getAlertBadgeVariant(alert.type)}>
                        {alert.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(alert.created_at)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="mb-4">{alert.message}</p>
                  <div className="flex justify-end">
                    {!alert.read && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleMarkAsRead(alert.id)}
                      >
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark as Read
                      </Button>
                    )}
                  </div>
                </CardContent>
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
    </Layout>
  );
};

export default Alerts;

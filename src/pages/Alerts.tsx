
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, User, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase, getTable } from "@/integrations/supabase/client";
import { Alert, AlertType } from "@/types/alerts";

const AlertsPage = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertFilter, setAlertFilter] = useState<AlertType | "all">("all");
  const queryClient = useQueryClient();

  // Fetch alerts on mount
  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await getTable("alerts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching alerts:", error);
          return;
        }

        // Add sender information for connection requests
        const alertsWithSender = await Promise.all(data.map(async (alert: Alert) => {
          if (alert.type === "connection_request" && alert.related_id) {
            // Get the connection request to find the sender
            const { data: requestData, error: requestError } = await getTable("connection_requests")
              .select("*")
              .eq("id", alert.related_id)
              .single();

            if (requestError) {
              console.error("Error fetching connection request:", requestError);
              return alert;
            }

            if (requestData.sender_id) {
              // Get the sender's profile
              const { data: senderData, error: senderError } = await supabase
                .from("user_profiles")
                .select("id, username, avatar_url")
                .eq("id", requestData.sender_id)
                .single();

              if (senderError) {
                console.error("Error fetching sender:", senderError);
                return alert;
              }

              return {
                ...alert,
                sender: senderData
              };
            }
          }
          return alert;
        }));

        setAlerts(alertsWithSender);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    // Setup real-time subscription for alerts
    const alertsChannel = supabase
      .channel('alerts-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alerts',
        filter: `user_id=eq.${supabase.auth.getUser().then(({ data }) => data.user?.id)}`
      }, payload => {
        fetchAlerts();
        if (payload.eventType === 'INSERT') {
          toast.info('New alert received');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
    };
  }, []);

  const handleAcceptConnection = async (alertId: string, relatedId?: string) => {
    if (!relatedId) return;

    try {
      // Update the connection request
      const { error: updateError } = await getTable("connection_requests")
        .update({ status: 'accepted' })
        .eq("id", relatedId);

      if (updateError) {
        console.error("Error accepting connection:", updateError);
        toast.error("Failed to accept connection request");
        return;
      }

      // Mark the alert as read
      const { error: alertError } = await getTable("alerts")
        .update({ read: true })
        .eq("id", alertId);

      if (alertError) {
        console.error("Error marking alert as read:", alertError);
      }

      // Update UI
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, read: true } 
            : alert
        )
      );

      toast.success("Connection request accepted");
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["user_connections"] });
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const handleDeclineConnection = async (alertId: string, relatedId?: string) => {
    if (!relatedId) return;

    try {
      // Update the connection request
      const { error: updateError } = await getTable("connection_requests")
        .update({ status: 'declined' })
        .eq("id", relatedId);

      if (updateError) {
        console.error("Error declining connection:", updateError);
        toast.error("Failed to decline connection request");
        return;
      }

      // Mark the alert as read
      const { error: alertError } = await getTable("alerts")
        .update({ read: true })
        .eq("id", alertId);

      if (alertError) {
        console.error("Error marking alert as read:", alertError);
      }

      // Update UI
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, read: true } 
            : alert
        )
      );

      toast.success("Connection request declined");
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const handleMarkAsRead = async (alertId: string) => {
    try {
      const { error } = await getTable("alerts")
        .update({ read: true })
        .eq("id", alertId);

      if (error) {
        console.error("Error marking alert as read:", error);
        toast.error("Failed to mark alert as read");
        return;
      }

      // Update UI
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, read: true } 
            : alert
        )
      );
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const filteredAlerts = alertFilter === "all" 
    ? alerts 
    : alerts.filter(alert => alert.type === alertFilter);

  const renderAlertContent = (alert: Alert) => {
    switch (alert.type) {
      case "connection_request":
        return (
          <div className="flex flex-col gap-4">
            <div>
              {alert.sender && (
                <div className="flex items-center gap-3 my-2">
                  <img 
                    src={AvatarSelector.getAvatarImageUrl(alert.sender.avatar_url)}
                    alt={alert.sender.username} 
                    className="w-10 h-10 rounded-full" 
                  />
                  <div>
                    <p className="font-medium">{alert.sender.username}</p>
                    <p className="text-sm text-muted-foreground">wants to connect with you</p>
                  </div>
                </div>
              )}
              {!alert.read && (
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAcceptConnection(alert.id, alert.related_id)}
                    className="flex items-center gap-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Accept
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeclineConnection(alert.id, alert.related_id)}
                    className="flex items-center gap-1"
                  >
                    <XCircle className="h-4 w-4" />
                    Decline
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      case "connection_accepted":
        return (
          <div>
            <p>{alert.message}</p>
          </div>
        );
      case "streak_freeze":
      case "budget_alert":
      default:
        return (
          <div>
            <p>{alert.message}</p>
          </div>
        );
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Alerts & Notifications</h1>
          
          <Tabs 
            value={alertFilter} 
            onValueChange={(value) => setAlertFilter(value as AlertType | "all")}
            className="w-full sm:w-auto"
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="connection_request">Connections</TabsTrigger>
              <TabsTrigger value="streak_freeze">Streak</TabsTrigger>
              <TabsTrigger value="budget_alert">Budget</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <span>Your Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8">Loading notifications...</p>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No notifications to display</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`border rounded-md p-4 ${!alert.read ? 'bg-muted/20' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {alert.type === "connection_request" && <User className="h-5 w-5 text-blue-500" />}
                        {alert.type === "streak_freeze" && <Bell className="h-5 w-5 text-orange-500" />}
                        {alert.type === "budget_alert" && <Bell className="h-5 w-5 text-red-500" />}
                        {alert.type === "connection_accepted" && <CheckCircle className="h-5 w-5 text-green-500" />}
                        <div>
                          <h3 className="font-medium">{alert.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {!alert.read && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleMarkAsRead(alert.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                    
                    <div className="mt-3">
                      {renderAlertContent(alert)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AlertsPage;

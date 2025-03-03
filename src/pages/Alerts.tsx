
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertType } from "@/types/alerts";
import { getAvatarImageUrl } from "@/components/profile/AvatarSelector";

interface AlertWithSender extends Alert {
  sender?: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

const AlertsPage = () => {
  const [alerts, setAlerts] = useState<AlertWithSender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch alerts for the current user
      const { data: alertsData, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching alerts:", error);
        return;
      }

      // Process alerts to include sender data for connection requests
      if (alertsData) {
        const alertsWithSenders = await Promise.all(
          alertsData.map(async (alertItem: any) => {
            // Create a properly typed alert from raw data
            const alert: Alert = {
              id: alertItem.id,
              user_id: alertItem.user_id,
              title: alertItem.title,
              message: alertItem.message,
              type: alertItem.type as AlertType,
              related_id: alertItem.related_id,
              read: alertItem.read,
              created_at: alertItem.created_at
            };
            
            // If it's a connection request, fetch the sender's profile
            if (alert.type === "connection_request" && alert.related_id) {
              const { data: requestData } = await supabase
                .from("connection_requests")
                .select("*")
                .eq("id", alert.related_id)
                .single();

              if (requestData && requestData.sender_id) {
                const { data: senderData } = await supabase
                  .from("user_profiles")
                  .select("id, username, avatar_url")
                  .eq("id", requestData.sender_id)
                  .single();

                if (senderData) {
                  return { 
                    ...alert, 
                    sender: {
                      id: senderData.id,
                      username: senderData.username || "Unknown User",
                      avatar_url: senderData.avatar_url || "avatar-1.png"
                    } 
                  };
                }
              }
            }
            
            return alert;
          })
        );

        setAlerts(alertsWithSenders);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ read: true })
        .eq("id", alertId);

      if (error) {
        console.error("Error marking alert as read:", error);
        return;
      }

      // Update local state
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      ));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const acceptConnection = async (requestId: string) => {
    try {
      // Update connection request status
      const { error } = await supabase
        .from("connection_requests")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) {
        console.error("Error accepting connection:", error);
        return;
      }

      // Refresh alerts
      fetchAlerts();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const declineConnection = async (requestId: string) => {
    try {
      // Update connection request status
      const { error } = await supabase
        .from("connection_requests")
        .update({ status: "declined" })
        .eq("id", requestId);

      if (error) {
        console.error("Error declining connection:", error);
        return;
      }

      // Refresh alerts
      fetchAlerts();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const renderAlertContent = (alert: AlertWithSender) => {
    switch (alert.type) {
      case "connection_request":
        return (
          <div className="flex items-start gap-4 p-4">
            {alert.sender && (
              <Avatar className="h-12 w-12">
                <AvatarImage 
                  src={getAvatarImageUrl(alert.sender.avatar_url)} 
                  alt={alert.sender.username} 
                />
                <AvatarFallback>{alert.sender.username?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
            )}
            
            <div className="flex-1">
              <div className="font-medium">{alert.title}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {alert.sender ? `${alert.sender.username} wants to connect with you` : alert.message}
              </p>
              
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  onClick={() => acceptConnection(alert.related_id || "")}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => declineConnection(alert.related_id || "")}
                >
                  Decline
                </Button>
              </div>
            </div>
            
            {!alert.read && (
              <Badge variant="default" className="bg-primary ml-auto">New</Badge>
            )}
          </div>
        );
      
      case "streak_freeze":
      case "budget_alert":
      case "connection_accepted":
      default:
        return (
          <div className="flex items-start gap-4 p-4">
            <div className="flex-1">
              <div className="font-medium">{alert.title}</div>
              <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
            </div>
            
            {!alert.read && (
              <Badge variant="default" className="bg-primary ml-auto">New</Badge>
            )}
            
            {alert.read && (
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => markAsRead(alert.id)}
              >
                Dismiss
              </Button>
            )}
          </div>
        );
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Alerts & Notifications</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading alerts...</div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No alerts to display
              </div>
            ) : (
              <div className="divide-y">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`${!alert.read ? "bg-accent/40" : ""}`}
                    onClick={() => !alert.read && markAsRead(alert.id)}
                  >
                    {renderAlertContent(alert)}
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


import { useState, useEffect } from "react";
import { Bell, Check, X, FileText, Users, Flame } from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Alerts = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        const { data, error } = await supabase
          .from("alerts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // For connection requests, we need to get the sender's profile
        const alertsWithSenderInfo = await Promise.all(
          data.map(async (alert) => {
            if (alert.type === "connection_request") {
              // Get connection request to find sender
              const { data: requestData } = await supabase
                .from("connection_requests")
                .select("sender_id")
                .eq("id", alert.related_id)
                .single();

              if (requestData) {
                // Get sender profile
                const { data: profileData } = await supabase
                  .from("user_profiles")
                  .select("id, username, first_name, last_name, email, avatar_url")
                  .eq("id", requestData.sender_id)
                  .single();

                if (profileData) {
                  return { ...alert, sender: profileData };
                }
              }
            }
            return alert;
          })
        );

        setAlerts(alertsWithSenderInfo);
      } catch (error) {
        console.error("Error fetching alerts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  // Mark alert as read
  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ read: true })
        .eq("id", alertId);

      if (error) throw error;

      // Update local state
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      ));
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  };

  // Handle connection request response
  const handleConnectionRequest = async (alertId: string, requestId: string, accept: boolean) => {
    try {
      // Update connection request status
      const { error } = await supabase
        .from("connection_requests")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      // Mark alert as read
      await markAsRead(alertId);

      // Update local state to remove the alert from the list
      setAlerts(alerts.filter(alert => alert.id !== alertId));

      toast({
        title: accept ? "Connection accepted" : "Connection declined",
        description: accept 
          ? "You are now connected with this user" 
          : "The connection request has been declined",
      });
    } catch (error: any) {
      console.error("Error handling connection request:", error);
      toast({
        title: "Error",
        description: error.message || "There was an error processing your request",
        variant: "destructive",
      });
    }
  };

  // Render alert icon based on type
  const renderAlertIcon = (type: string) => {
    switch (type) {
      case "connection_request":
      case "connection_accepted":
        return <Users className="h-5 w-5 text-blue-500" />;
      case "streak_warning":
        return <Flame className="h-5 w-5 text-orange-500" />;
      case "budget_alert":
        return <FileText className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Alerts
        </h1>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading alerts...</div>
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Bell className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">You don't have any alerts yet</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-4 flex items-start gap-3 ${alert.read ? 'opacity-75' : ''}`}
                  >
                    <div className="mt-1">
                      {renderAlertIcon(alert.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium">
                          {alert.title}
                          {!alert.read && (
                            <Badge variant="secondary" className="ml-2">New</Badge>
                          )}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(alert.created_at)}
                        </span>
                      </div>
                      
                      <p className="text-muted-foreground mt-1">
                        {alert.message}
                      </p>
                      
                      {/* Connection request alert with profile info */}
                      {alert.type === "connection_request" && alert.sender && (
                        <div className="mt-3 flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage 
                              src={`/lovable-uploads/${alert.sender.avatar_url || 'avatar-1.png'}`} 
                              alt={alert.sender.username || alert.sender.email} 
                            />
                            <AvatarFallback>
                              {alert.sender.first_name?.[0]}{alert.sender.last_name?.[0] || ''}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {alert.sender.username || alert.sender.email}
                            </p>
                            {alert.sender.first_name && (
                              <p className="text-xs text-muted-foreground">
                                {alert.sender.first_name} {alert.sender.last_name || ''}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Action buttons for connection requests */}
                      {alert.type === "connection_request" && (
                        <div className="mt-3 flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleConnectionRequest(alert.id, alert.related_id, true)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleConnectionRequest(alert.id, alert.related_id, false)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}
                      
                      {/* Mark as read button for other alerts */}
                      {alert.type !== "connection_request" && !alert.read && (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="mt-3"
                          onClick={() => markAsRead(alert.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Alerts;

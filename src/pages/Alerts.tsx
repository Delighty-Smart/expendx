
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  UserPlus, 
  Flame, 
  AlertTriangle,
  Check, 
  X
} from "lucide-react";
import { toast } from "sonner";
import { updateUserStreak } from "@/lib/streak";

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'connection_request' | 'streak_freeze' | 'budget_alert' | 'connection_accepted';
  created_at: string;
  read: boolean;
  related_id?: string;
  sender?: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch user alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You must be logged in to view alerts");
          return;
        }
        
        setUserId(user.id);
        
        // Update streak when viewing alerts
        await updateUserStreak();
        
        // Fetch alerts
        const { data, error } = await supabase
          .from("alerts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
          
        if (error) {
          console.error("Error fetching alerts:", error);
          toast.error("Failed to load alerts");
          return;
        }
        
        // For connection requests, get sender information
        const alertsWithSenders = await Promise.all(
          data.map(async (alert: Alert) => {
            if (alert.type === 'connection_request' && alert.related_id) {
              // Get connection request
              const { data: requestData } = await supabase
                .from("connection_requests")
                .select("sender_id")
                .eq("id", alert.related_id)
                .maybeSingle();
                
              if (requestData) {
                // Get sender profile
                const { data: senderData } = await supabase
                  .from("user_profiles")
                  .select("id, username, avatar_url")
                  .eq("id", requestData.sender_id)
                  .maybeSingle();
                  
                if (senderData) {
                  return {
                    ...alert,
                    sender: senderData
                  };
                }
              }
            }
            return alert;
          })
        );
        
        setAlerts(alertsWithSenders);
      } catch (error) {
        console.error("Error:", error);
        toast.error("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlerts();
    
    // Set up subscription for real-time alerts
    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes', 
        { 
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          // Add new alert to the list
          setAlerts(prev => [payload.new as Alert, ...prev]);
          toast.success("You have a new notification");
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Mark all alerts as read
  const markAllAsRead = async () => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);
        
      if (error) {
        console.error("Error marking alerts as read:", error);
        toast.error("Failed to mark alerts as read");
        return;
      }
      
      // Update local state
      setAlerts(alerts.map(alert => ({ ...alert, read: true })));
      
      toast.success("All alerts marked as read");
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    }
  };

  // Handle connection request response
  const handleConnectionRequest = async (alertId: string, requestId: string | undefined, accept: boolean) => {
    if (!userId || !requestId) return;
    
    try {
      // Update the connection request status
      const { error: requestError } = await supabase
        .from("connection_requests")
        .update({ 
          status: accept ? 'accepted' : 'declined',
          updated_at: new Date().toISOString()
        })
        .eq("id", requestId);
        
      if (requestError) {
        console.error("Error updating connection request:", requestError);
        toast.error(`Failed to ${accept ? 'accept' : 'decline'} connection request`);
        return;
      }
      
      // Mark the alert as read
      const { error: alertError } = await supabase
        .from("alerts")
        .update({ read: true })
        .eq("id", alertId);
        
      if (alertError) {
        console.error("Error marking alert as read:", alertError);
      }
      
      // Update local state
      setAlerts(alerts.map(alert => 
        alert.id === alertId 
          ? { ...alert, read: true }
          : alert
      ));
      
      toast.success(`Connection request ${accept ? 'accepted' : 'declined'}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    }
  };

  // Helper to get avatar image URL
  const getAvatarUrl = (key: string): string => {
    // This should match the logic in AvatarSelector component
    const avatarImages: Record<string, string> = {
      "avatar-1.png": "/lovable-uploads/c2a2d26c-0523-4fb9-9813-51aac4bc3987.png",
      "avatar-2.png": "/lovable-uploads/23786936-39a8-4e94-9eb3-3464ed7ffc82.png",
      "avatar-3.png": "/lovable-uploads/2bcde0f4-1483-4e84-a8e4-0227c5bdc9e8.png",
      "avatar-4.png": "/lovable-uploads/167baf60-e95c-4360-a687-d246ef45f33e.png",
      // Add remaining mappings as in AvatarSelector
    };
    
    return avatarImages[key] || 
      `https://api.dicebear.com/7.x/personas/svg?seed=${key}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4`;
  };

  // Get icon based on alert type
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'connection_request':
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      case 'connection_accepted':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'streak_freeze':
        return <Flame className="h-5 w-5 text-orange-500" />;
      case 'budget_alert':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Alerts</h1>
          
          {alerts.some(alert => !alert.read) && (
            <Button variant="outline" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <p>Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No alerts</p>
              <p className="text-muted-foreground">You don't have any alerts at the moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <Card 
                key={alert.id} 
                className={`overflow-hidden ${!alert.read ? 'border-primary' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="mt-1">
                      {getAlertIcon(alert.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3 className="font-medium">{alert.title}</h3>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      
                      {alert.type === 'connection_request' && alert.sender && (
                        <div className="mt-3 flex items-center">
                          <img
                            src={getAvatarUrl(alert.sender.avatar_url)}
                            alt={alert.sender.username}
                            className="w-8 h-8 rounded-full mr-2"
                          />
                          <span className="text-sm font-medium">
                            {alert.sender.username || "Anonymous User"}
                          </span>
                          
                          {!alert.read && (
                            <div className="ml-auto flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8"
                                onClick={() => handleConnectionRequest(alert.id, alert.related_id, false)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Decline
                              </Button>
                              
                              <Button 
                                size="sm"
                                className="h-8"
                                onClick={() => handleConnectionRequest(alert.id, alert.related_id, true)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Alerts;

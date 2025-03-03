
import { useState, useEffect } from "react";
import { supabase, getTable } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, UserPlus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { UserProfile } from "@/types/alerts";

interface User {
  id: string;
  username: string;
  avatar_url: string;
  country: string;
  connection_status?: 'pending' | 'connected' | 'none';
}

const UserSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [connections, setConnections] = useState<Set<string>>(new Set());

  // Get current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        
        // Fetch existing connection requests
        const { data: sentRequests, error: requestsError } = await getTable("connection_requests")
          .select("receiver_id, status")
          .eq("sender_id", user.id);
          
        if (sentRequests && !requestsError) {
          const pending = new Set(
            sentRequests
              .filter(r => r.status === 'pending')
              .map(r => r.receiver_id)
          );
          setPendingRequests(pending);
        }
        
        // Fetch existing connections
        const { data: userConnections, error: connectionsError } = await getTable("connections")
          .select("user_id_1, user_id_2")
          .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);
          
        if (userConnections && !connectionsError) {
          const connected = new Set(
            userConnections.map(c => 
              c.user_id_1 === user.id ? c.user_id_2 : c.user_id_1
            )
          );
          setConnections(connected);
        }
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Search users as user types
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || !currentUserId) return;
      
      setLoading(true);
      try {
        // Search for users with similar username (case insensitive)
        const { data, error } = await supabase
          .from("user_profiles")
          .select("id, username, avatar_url, country")
          .ilike("username", `%${searchQuery}%`)
          .neq("id", currentUserId) // Exclude current user
          .order("username")
          .limit(10);
          
        if (error) {
          console.error("Error searching users:", error);
          return;
        }
        
        // Add connection status to each user
        const usersWithStatus = data.map((user: any) => {
          let status: 'pending' | 'connected' | 'none' = 'none';
          
          if (connections.has(user.id)) {
            status = 'connected';
          } else if (pendingRequests.has(user.id)) {
            status = 'pending';
          }
          
          return {
            ...user,
            connection_status: status
          };
        });
        
        setUsers(usersWithStatus);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce search to prevent too many requests
    const timer = setTimeout(() => {
      searchUsers();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId, connections, pendingRequests]);

  const handleSendRequest = async (userId: string) => {
    if (!currentUserId) {
      toast.error("You must be logged in to send connection requests");
      return;
    }
    
    try {
      const { error } = await getTable("connection_requests")
        .insert({
          sender_id: currentUserId,
          receiver_id: userId,
        });
        
      if (error) {
        console.error("Error sending request:", error);
        
        // Check if it's a unique constraint error (already sent request)
        if (error.code === '23505') {
          toast.error("You've already sent a request to this user");
        } else {
          toast.error("Failed to send connection request");
        }
        return;
      }
      
      // Update UI
      setPendingRequests(prev => new Set([...prev, userId]));
      
      // Update the user in the results
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, connection_status: 'pending' } 
          : user
      ));
      
      toast.success("Connection request sent");
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

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <div className="space-y-2">
        {loading ? (
          <p>Searching...</p>
        ) : searchQuery && users.length === 0 ? (
          <p>No users found</p>
        ) : (
          users.map((user) => (
            <Card key={user.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={getAvatarUrl(user.avatar_url)}
                      alt={user.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium">{user.username || "Anonymous User"}</p>
                      {user.country && (
                        <p className="text-sm text-muted-foreground">{user.country}</p>
                      )}
                    </div>
                  </div>
                  
                  {user.connection_status === 'connected' ? (
                    <div className="flex items-center text-green-500">
                      <Check className="h-4 w-4 mr-1" />
                      <span className="text-sm">Connected</span>
                    </div>
                  ) : user.connection_status === 'pending' ? (
                    <div className="flex items-center text-yellow-500">
                      <span className="text-sm">Request Pending</span>
                    </div>
                  ) : (
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendRequest(user.id)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Connect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
        
        {searchQuery && !loading && users.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No users found matching your search
          </p>
        )}
        
        {!searchQuery && (
          <p className="text-center text-muted-foreground py-4">
            Type to search for users
          </p>
        )}
      </div>
    </div>
  );
};

export default UserSearch;

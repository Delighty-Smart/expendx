
import { useState, useEffect } from "react";
import { Search, UserPlus, Users, Trophy, Map } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LeaderboardSection from "./LeaderboardSection";

const CommunityTab = ({ profile }: { profile: any }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [connections, setConnections] = useState<string[]>([]);
  const { toast } = useToast();

  // Get existing connection requests and connections
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch connection requests
        const { data: requestsData } = await supabase
          .from("connection_requests")
          .select("receiver_id")
          .eq("sender_id", user.id)
          .eq("status", "pending");

        if (requestsData) {
          setPendingRequests(requestsData.map(r => r.receiver_id));
        }

        // Fetch connections
        const { data: connectionsData } = await supabase
          .from("connections")
          .select("user_id_1, user_id_2")
          .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

        if (connectionsData) {
          const connectionIds = connectionsData.map(c => 
            c.user_id_1 === user.id ? c.user_id_2 : c.user_id_1
          );
          setConnections(connectionIds);
        }
      } catch (error) {
        console.error("Error fetching connections:", error);
      }
    };

    if (profile) {
      fetchConnections();
    }
  }, [profile]);

  // Search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Search by email or username
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .or(`email.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
          .neq("id", user.id)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimeout = setTimeout(() => {
      searchUsers();
    }, 500);

    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  const sendConnectionRequest = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to send connection requests.",
          variant: "destructive"
        });
        return;
      }

      // Insert connection request
      const { error } = await supabase
        .from("connection_requests")
        .insert({
          sender_id: user.id,
          receiver_id: userId
        });

      if (error) throw error;

      // Update UI
      setPendingRequests([...pendingRequests, userId]);
      
      toast({
        title: "Request sent",
        description: "Your connection request has been sent."
      });
    } catch (error: any) {
      console.error("Error sending connection request:", error);
      toast({
        title: "Request failed",
        description: error.message || "There was an error sending your request. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Community
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by username or email..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="mt-4 space-y-4">
            {isSearching ? (
              <div className="text-center py-4 text-muted-foreground">Searching...</div>
            ) : searchQuery && searchResults.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No users found</div>
            ) : (
              searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={`/lovable-uploads/${user.avatar_url || 'avatar-1.png'}`} alt={user.username || user.email} />
                      <AvatarFallback>
                        {user.first_name?.[0]}{user.last_name?.[0] || ''}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">{user.username || user.email}</h4>
                      {user.first_name && (
                        <p className="text-sm text-muted-foreground">
                          {user.first_name} {user.last_name || ''}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {connections.includes(user.id) ? (
                    <span className="text-sm text-muted-foreground px-3 py-1 bg-accent/50 rounded-full">
                      Connected
                    </span>
                  ) : pendingRequests.includes(user.id) ? (
                    <span className="text-sm text-muted-foreground px-3 py-1 bg-accent/50 rounded-full">
                      Request Sent
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => sendConnectionRequest(user.id)}>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Connect
                    </Button>
                  )}
                </div>
              ))
            )}
            
            {!searchQuery && (
              <div className="text-center py-4 text-muted-foreground">
                Search for users to connect with
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="global" className="flex items-center gap-1">
            <Trophy className="h-4 w-4" />
            Global Leaderboard
          </TabsTrigger>
          <TabsTrigger value="local" className="flex items-center gap-1">
            <Map className="h-4 w-4" />
            Local Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <LeaderboardSection type="global" />
        </TabsContent>

        <TabsContent value="local">
          <LeaderboardSection 
            type="local" 
            continent={profile?.continent}
            country={profile?.country}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommunityTab;

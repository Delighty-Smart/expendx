
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, User } from "lucide-react";

// Define types
interface LeaderboardUser {
  id: string;
  username: string;
  avatar_url: string;
  current_streak: number;
  highest_streak: number;
  current_title: string;
  country: string;
  continent: string;
}

const Leaderboard = () => {
  const [leaderboardType, setLeaderboardType] = useState("global");
  const [continentFilter, setContinentFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [availableContinents, setAvailableContinents] = useState<string[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  
  // Fetch users for leaderboard
  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setLoading(true);
      try {
        // Fetch user profiles with streaks
        let query = supabase
          .from("user_profiles")
          .select(`
            id,
            username,
            avatar_url,
            country,
            continent,
            user_streaks!inner(
              current_streak,
              highest_streak,
              current_title
            )
          `)
          .order("username");
        
        // Apply filters based on leaderboard type
        if (leaderboardType === "continental" && continentFilter !== "all") {
          query = query.eq("continent", continentFilter);
        }
        
        if (leaderboardType === "national" && countryFilter !== "all") {
          query = query.eq("country", countryFilter);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error("Error fetching leaderboard:", error);
          return;
        }
        
        // Transform data to include streak information
        const transformedData = data.map((user: any) => ({
          id: user.id,
          username: user.username || "Anonymous User",
          avatar_url: user.avatar_url || "avatar-1.png",
          current_streak: user.user_streaks.current_streak,
          highest_streak: user.user_streaks.highest_streak,
          current_title: user.user_streaks.current_title,
          country: user.country || "Unknown",
          continent: user.continent || "Unknown"
        }));
        
        // Sort by highest streak
        const sortedData = transformedData.sort((a, b) => b.current_streak - a.current_streak);
        
        setUsers(sortedData);
        
        // Extract available continents and countries for filters
        const continents = Array.from(
          new Set(
            data
              .map((user: any) => user.continent)
              .filter(Boolean)
          )
        );
        
        const countries = Array.from(
          new Set(
            data
              .map((user: any) => user.country)
              .filter(Boolean)
          )
        );
        
        setAvailableContinents(continents as string[]);
        setAvailableCountries(countries as string[]);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboardData();
  }, [leaderboardType, continentFilter, countryFilter]);

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
      <Tabs value={leaderboardType} onValueChange={setLeaderboardType} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="continental">Continental</TabsTrigger>
          <TabsTrigger value="national">National</TabsTrigger>
        </TabsList>
        
        <TabsContent value="global" className="space-y-4 mt-4">
          <LeaderboardDisplay 
            users={users} 
            loading={loading} 
            getAvatarUrl={getAvatarUrl} 
          />
        </TabsContent>
        
        <TabsContent value="continental" className="space-y-4 mt-4">
          <div className="mb-4">
            <Select value={continentFilter} onValueChange={setContinentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select continent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Continents</SelectItem>
                {availableContinents.map((continent) => (
                  <SelectItem key={continent} value={continent}>{continent}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <LeaderboardDisplay 
            users={users} 
            loading={loading} 
            getAvatarUrl={getAvatarUrl} 
          />
        </TabsContent>
        
        <TabsContent value="national" className="space-y-4 mt-4">
          <div className="mb-4">
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {availableCountries.map((country) => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <LeaderboardDisplay 
            users={users} 
            loading={loading} 
            getAvatarUrl={getAvatarUrl} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Separate component for the leaderboard display
const LeaderboardDisplay = ({ 
  users, 
  loading, 
  getAvatarUrl 
}: { 
  users: LeaderboardUser[],
  loading: boolean,
  getAvatarUrl: (key: string) => string
}) => {
  if (loading) {
    return <p className="text-center py-8">Loading leaderboard data...</p>;
  }
  
  if (users.length === 0) {
    return (
      <p className="text-center py-8 text-muted-foreground">
        No users found for this leaderboard
      </p>
    );
  }
  
  // Extract top 3 users
  const topUsers = users.slice(0, 3);
  const otherUsers = users.slice(3);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-around items-end">
        {topUsers.length >= 2 && (
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <img
                src={getAvatarUrl(topUsers[1].avatar_url)}
                alt={topUsers[1].username}
                className="w-16 h-16 rounded-full border-2 border-gray-300"
              />
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-300 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
            </div>
            <p className="font-medium text-sm mt-1">{topUsers[1].username}</p>
            <p className="text-xs text-muted-foreground">{topUsers[1].current_streak} days</p>
          </div>
        )}
        
        {topUsers.length >= 1 && (
          <div className="flex flex-col items-center z-10 mb-4">
            <div className="relative mb-2">
              <img
                src={getAvatarUrl(topUsers[0].avatar_url)}
                alt={topUsers[0].username}
                className="w-20 h-20 rounded-full border-2 border-yellow-400"
              />
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
            </div>
            <p className="font-medium text-sm mt-1">{topUsers[0].username}</p>
            <p className="text-xs text-muted-foreground">{topUsers[0].current_streak} days</p>
            <div className="flex items-center gap-1 mt-1 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
              <Trophy className="h-3 w-3" />
              <span>{topUsers[0].current_title}</span>
            </div>
          </div>
        )}
        
        {topUsers.length >= 3 && (
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <img
                src={getAvatarUrl(topUsers[2].avatar_url)}
                alt={topUsers[2].username}
                className="w-16 h-16 rounded-full border-2 border-amber-600"
              />
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-amber-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
            </div>
            <p className="font-medium text-sm mt-1">{topUsers[2].username}</p>
            <p className="text-xs text-muted-foreground">{topUsers[2].current_streak} days</p>
          </div>
        )}
      </div>
      
      <div className="space-y-2 mt-8">
        {otherUsers.map((user, index) => (
          <Card key={user.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 text-center font-medium text-muted-foreground">
                    {index + 4}
                  </div>
                  <img
                    src={getAvatarUrl(user.avatar_url)}
                    alt={user.username}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{user.username}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{user.current_title}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center bg-primary/10 px-3 py-1 rounded-full">
                  <span className="text-primary font-medium">{user.current_streak} days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;

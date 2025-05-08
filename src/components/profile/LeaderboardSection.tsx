
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface LeaderboardItem {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  current_streak: number;
  highest_streak: number;
  avatar_url?: string;
}

interface LeaderboardSectionProps {
  type: 'global' | 'local';
  continent?: string;
  country?: string;
}

const LeaderboardSection = ({ type, continent, country }: LeaderboardSectionProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Set up realtime subscription to update leaderboard when user_streaks changes
  useRealtimeSubscription('user_streaks', '*', () => {
    console.log("User streaks updated, refreshing leaderboard");
    fetchLeaderboardData();
  });

  const fetchLeaderboardData = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      
      // First get user profiles with their locations to filter by
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, username, first_name, last_name, email, avatar_url, country, continent');
        
      if (profilesError) throw profilesError;
      
      // Now get all user streaks 
      const { data: streaksData, error: streaksError } = await supabase
        .from('user_streaks')
        .select('user_id, current_streak, highest_streak')
        .order('current_streak', { ascending: false });
        
      if (streaksError) throw streaksError;
      
      if (!profilesData || !streaksData) {
        setLeaderboard([]);
        return;
      }
      
      // Filter profiles data if local leaderboard
      let filteredProfiles = profilesData;
      if (type === 'local') {
        if (country) {
          filteredProfiles = profilesData.filter(profile => profile.country === country);
        } else if (continent) {
          filteredProfiles = profilesData.filter(profile => profile.continent === continent);
        }
      }
      
      // Create a map of user IDs to their profiles for quick lookup
      const userProfileMap = new Map();
      filteredProfiles.forEach(profile => {
        userProfileMap.set(profile.id, profile);
      });
      
      // Join the streaks with the filtered profiles
      const formattedData = streaksData
        .filter(streak => userProfileMap.has(streak.user_id))
        .map(streak => {
          const profile = userProfileMap.get(streak.user_id);
          return {
            id: streak.user_id,
            username: profile?.username,
            first_name: profile?.first_name,
            last_name: profile?.last_name,
            email: profile?.email,
            current_streak: streak.current_streak,
            highest_streak: streak.highest_streak,
            avatar_url: profile?.avatar_url,
          };
        });
      
      setLeaderboard(formattedData);
      
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [type, continent, country, toast]);

  const getDisplayName = (item: LeaderboardItem) => {
    if (item.username) return item.username;
    if (item.first_name || item.last_name) 
      return `${item.first_name || ''} ${item.last_name || ''}`.trim();
    return item.email.split('@')[0];
  };

  const getInitials = (item: LeaderboardItem) => {
    if (item.first_name && item.last_name) 
      return `${item.first_name[0]}${item.last_name[0]}`.toUpperCase();
    if (item.username) return item.username.substring(0, 2).toUpperCase();
    return item.email.substring(0, 2).toUpperCase();
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return "bg-gradient-to-r from-amber-500 to-yellow-300 text-black";
    if (streak >= 14) return "bg-gradient-to-r from-blue-600 to-blue-400 text-white";
    if (streak >= 7) return "bg-gradient-to-r from-green-600 to-green-400 text-white";
    return "";
  };

  return (
    <div className="space-y-4">
      {type === 'local' && (!continent && !country) ? (
        <div className="text-center p-6 bg-muted/50 rounded-md">
          <p className="text-muted-foreground">
            Set your location in your profile to see the local leaderboard
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center p-6">
          <div className="animate-pulse text-muted-foreground">Loading leaderboard...</div>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center p-6 bg-muted/50 rounded-md">
          <p className="text-muted-foreground">
            No data available for the {type} leaderboard
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((item, index) => (
            <div 
              key={item.id} 
              className={`flex items-center p-3 rounded-md ${
                currentUserId === item.id 
                  ? "bg-primary/10 border border-primary/30" 
                  : "hover:bg-accent"
              }`}
            >
              <div className="w-8 text-center font-bold text-muted-foreground">
                {index + 1}
              </div>
              
              <Avatar className="h-8 w-8 mr-3">
                {item.avatar_url ? (
                  <AvatarImage src={item.avatar_url} alt={getDisplayName(item)} />
                ) : (
                  <AvatarFallback>{getInitials(item)}</AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex-1">
                <div className="font-medium text-sm">{getDisplayName(item)}</div>
              </div>
              
              <div className="flex gap-2 items-center">
                <Badge 
                  className={`${getStreakColor(item.current_streak)}`}
                  variant="outline"
                >
                  {item.current_streak} day{item.current_streak !== 1 ? "s" : ""}
                </Badge>
                
                {item.highest_streak > item.current_streak && (
                  <span className="text-xs text-muted-foreground">
                    Best: {item.highest_streak}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaderboardSection;

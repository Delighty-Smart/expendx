
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
      
      let query = supabase
        .from('user_streaks')
        .select(`
          id:user_id,
          current_streak,
          highest_streak,
          user_profiles:user_id(username, first_name, last_name, email, avatar_url, country, continent)
        `)
        .order('current_streak', { ascending: false });
      
      // Apply location filter for local leaderboard
      if (type === 'local' && country) {
        query = query.eq('user_profiles.country', country);
      } else if (type === 'local' && continent && !country) {
        query = query.eq('user_profiles.continent', continent);
      }
      
      // Remove any row limit to get ALL users in the leaderboard
      const { data, error } = await query;

      if (error) {
        throw error;
      }
      
      // Transform the data to a flattened structure
      const formattedData = data?.map(entry => ({
        id: entry.id,
        username: entry.user_profiles?.username,
        first_name: entry.user_profiles?.first_name,
        last_name: entry.user_profiles?.last_name,
        email: entry.user_profiles?.email,
        current_streak: entry.current_streak,
        highest_streak: entry.highest_streak,
        avatar_url: entry.user_profiles?.avatar_url,
      })) || [];
      
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

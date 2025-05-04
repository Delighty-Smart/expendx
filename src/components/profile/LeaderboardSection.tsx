
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Map, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardProfile {
  id: string;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  current_streak: number;
  current_title: string;
}

interface LeaderboardSectionProps {
  type: "global" | "local";
  continent?: string;
  country?: string;
}

const LeaderboardSection = ({ type, continent, country }: LeaderboardSectionProps) => {
  const [profiles, setProfiles] = useState<LeaderboardProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setLoading(true);
      
      try {
        let query = supabase
          .from('user_profiles')
          .select(`
            id,
            username,
            first_name,
            last_name,
            avatar_url,
            user_streaks!inner (
              current_streak,
              current_title
            )
          `)
          .order('user_streaks.current_streak', { ascending: false })
          .limit(20);
        
        // Add geographic filters for local leaderboard
        if (type === 'local') {
          if (continent) {
            query = query.eq('continent', continent);
          }
          if (country) {
            query = query.eq('country', country);
          }
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching leaderboard data:', error);
          throw error;
        }
        
        // Transform the data
        const transformedData = data?.map(profile => ({
          id: profile.id,
          username: profile.username,
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url,
          current_streak: profile.user_streaks[0].current_streak,
          current_title: profile.user_streaks[0].current_title
        })) || [];
        
        setProfiles(transformedData);
      } catch (err) {
        console.error('Failed to load leaderboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboardData();
    
    // Set up real-time subscription for leaderboard updates
    const channel = supabase
      .channel('public:user_streaks')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_streaks' }, 
        () => {
          fetchLeaderboardData();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [type, continent, country]);

  const getInitials = (profile: LeaderboardProfile) => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`;
    }
    if (profile.first_name) {
      return profile.first_name[0];
    }
    if (profile.username) {
      return profile.username[0];
    }
    return 'U';
  };

  const getDisplayName = (profile: LeaderboardProfile) => {
    if (profile.first_name) {
      return profile.first_name + (profile.last_name ? ` ${profile.last_name}` : '');
    }
    if (profile.username) {
      return profile.username;
    }
    return 'User';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {profiles.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="mb-2">No users found for this leaderboard</p>
          {type === 'local' && <p className="text-sm">Try checking the global leaderboard instead</p>}
        </div>
      ) : (
        <ul className="space-y-4">
          {profiles.map((profile, index) => (
            <li 
              key={profile.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                currentUserId === profile.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-accent/50'
              }`}
            >
              <div className="flex items-center justify-center w-8 h-8 text-sm font-bold">
                {index === 0 && <Trophy className="text-amber-500 h-6 w-6" />}
                {index === 1 && <Trophy className="text-slate-400 h-5 w-5" />}
                {index === 2 && <Trophy className="text-amber-700 h-5 w-5" />}
                {index > 2 && <span className="text-muted-foreground">{index + 1}</span>}
              </div>
              
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={profile.avatar_url || ''} alt={getDisplayName(profile)} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(profile)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {getDisplayName(profile)}
                    {currentUserId === profile.id && (
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-2">
                        You
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-1 font-semibold text-primary">
                    <Flame className="h-4 w-4 text-amber-500" />
                    <span>{profile.current_streak}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{profile.current_title}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LeaderboardSection;

// Add Flame icon definition
const Flame = (props: any) => {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
};

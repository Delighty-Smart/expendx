import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame } from "lucide-react";
import { getAvatarImageUrl } from "./AvatarSelector";

type UserStreak = {
  id: string;
  username: string;
  avatar_url: string;
  continent?: string;
  country?: string;
  current_streak: number;
  highest_streak: number;
};

const Leaderboard = () => {
  const [leaderboardType, setLeaderboardType] = useState<'global' | 'regional'>('global');
  const [regionFilter, setRegionFilter] = useState<'continent' | 'country'>('continent');
  const [selectedContinent, setSelectedContinent] = useState<string>('Africa');
  const [selectedCountry, setSelectedCountry] = useState<string>('Nigeria');
  const [loading, setLoading] = useState(true);
  const [globalLeaders, setGlobalLeaders] = useState<UserStreak[]>([]);
  const [regionalLeaders, setRegionalLeaders] = useState<UserStreak[]>([]);

  const continents = [
    'Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 
    'Australia/Oceania', 'South America'
  ];
  
  const countries = [
    'Nigeria', 'United States', 'United Kingdom', 'Canada', 'Australia',
    'Germany', 'France', 'Japan', 'China', 'India', 'Brazil', 'Mexico'
  ];

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboards = async () => {
      setLoading(true);
      try {
        // Global leaderboard - modified to use join correctly
        const { data: streakData, error: streakError } = await supabase
          .from('user_streaks')
          .select(`
            id,
            current_streak,
            highest_streak,
            user_id
          `)
          .order('current_streak', { ascending: false })
          .limit(10);
        
        if (streakError) {
          console.error("Error fetching streak data:", streakError);
          setGlobalLeaders([]);
        } else if (streakData) {
          // Get user profiles for the streaks
          const userIds = streakData.map(item => item.user_id);
          
          const { data: profilesData, error: profilesError } = await supabase
            .from('user_profiles')
            .select('id, username, avatar_url, continent, country')
            .in('id', userIds);
          
          if (profilesError) {
            console.error("Error fetching user profiles:", profilesError);
          } else if (profilesData) {
            // Combine the data
            const leaderboardData = streakData.map(streak => {
              const userProfile = profilesData.find(profile => profile.id === streak.user_id);
              return {
                id: streak.user_id,
                username: userProfile?.username || 'Anonymous User',
                avatar_url: userProfile?.avatar_url || 'avatar-1.png',
                continent: userProfile?.continent,
                country: userProfile?.country,
                current_streak: streak.current_streak,
                highest_streak: streak.highest_streak
              };
            });
            
            setGlobalLeaders(leaderboardData);
          }
        }
        
        // Regional leaderboard with similar approach
        const regionKey = regionFilter === 'continent' ? 'continent' : 'country';
        const regionValue = regionFilter === 'continent' ? selectedContinent : selectedCountry;
        
        // First get profiles that match the region
        const { data: regionProfiles, error: regionProfilesError } = await supabase
          .from('user_profiles')
          .select('id, username, avatar_url, continent, country')
          .eq(regionKey, regionValue);
        
        if (regionProfilesError) {
          console.error("Error fetching regional profiles:", regionProfilesError);
          setRegionalLeaders([]);
        } else if (regionProfiles) {
          const regionUserIds = regionProfiles.map(profile => profile.id);
          
          if (regionUserIds.length > 0) {
            // Get streaks for these users
            const { data: regionStreaks, error: regionStreaksError } = await supabase
              .from('user_streaks')
              .select('user_id, current_streak, highest_streak')
              .in('user_id', regionUserIds)
              .order('current_streak', { ascending: false })
              .limit(10);
            
            if (regionStreaksError) {
              console.error("Error fetching regional streaks:", regionStreaksError);
            } else if (regionStreaks) {
              // Combine the data
              const regionalData = regionStreaks.map(streak => {
                const userProfile = regionProfiles.find(profile => profile.id === streak.user_id);
                return {
                  id: streak.user_id,
                  username: userProfile?.username || 'Anonymous User',
                  avatar_url: userProfile?.avatar_url || 'avatar-1.png',
                  continent: userProfile?.continent,
                  country: userProfile?.country,
                  current_streak: streak.current_streak,
                  highest_streak: streak.highest_streak
                };
              });
              
              setRegionalLeaders(regionalData);
            }
          } else {
            setRegionalLeaders([]);
          }
        }
      } catch (error) {
        console.error("Error:", error);
        setGlobalLeaders([]);
        setRegionalLeaders([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboards();
  }, [leaderboardType, regionFilter, selectedContinent, selectedCountry]);

  const renderLeaderboardItems = (leaders: UserStreak[]) => {
    if (loading) {
      return <p className="text-center py-8">Loading leaderboard data...</p>;
    }
    
    if (leaders.length === 0) {
      return <p className="text-center py-8">No users found for this leaderboard</p>;
    }
    
    return leaders.map((user, index) => (
      <div key={user.id} className="flex items-center p-4 border-b last:border-0">
        <div className="font-bold text-lg w-8">{index + 1}</div>
        <div className="flex items-center flex-1">
          <img
            src={getAvatarImageUrl(user.avatar_url)}
            alt={user.username}
            className="w-10 h-10 rounded-full mr-3"
          />
          <div>
            <p className="font-medium">{user.username}</p>
            {user.country && <p className="text-xs text-muted-foreground">{user.country}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 font-semibold">
          <Flame className="h-5 w-5 text-orange-500" />
          <span>{user.current_streak}</span>
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      <Tabs value={leaderboardType} onValueChange={(value: string) => setLeaderboardType(value as 'global' | 'regional')}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="regional">Regional</TabsTrigger>
        </TabsList>
        
        <TabsContent value="global" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Global Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              {renderLeaderboardItems(globalLeaders)}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="regional" className="mt-0">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select
                  value={regionFilter}
                  onValueChange={(value: string) => setRegionFilter(value as 'continent' | 'country')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="continent">Continent</SelectItem>
                    <SelectItem value="country">Country</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {regionFilter === 'continent' ? (
                <div className="flex-1">
                  <Select
                    value={selectedContinent}
                    onValueChange={setSelectedContinent}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select continent" />
                    </SelectTrigger>
                    <SelectContent>
                      {continents.map(continent => (
                        <SelectItem key={continent} value={continent}>
                          {continent}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex-1">
                  <Select
                    value={selectedCountry}
                    onValueChange={setSelectedCountry}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(country => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>
                  {regionFilter === 'continent' 
                    ? `${selectedContinent} Leaderboard` 
                    : `${selectedCountry} Leaderboard`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderLeaderboardItems(regionalLeaders)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;


import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame } from "lucide-react";

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
        // Simulated data for now until we have more users
        // Global leaderboard
        let query = supabase
          .from('user_streaks')
          .select(`
            id,
            current_streak,
            highest_streak,
            user_profiles:user_id (
              id,
              username,
              avatar_url,
              continent,
              country
            )
          `)
          .order('current_streak', { ascending: false })
          .limit(10);
        
        const { data: globalData, error: globalError } = await query;
        
        if (globalError) {
          console.error("Error fetching global leaderboard:", globalError);
        } else {
          // Process the data
          const processedGlobalData = (globalData || [])
            .filter(item => item.user_profiles)
            .map(item => ({
              id: item.user_profiles.id,
              username: item.user_profiles.username || 'Anonymous User',
              avatar_url: item.user_profiles.avatar_url || 'avatar-1.png',
              continent: item.user_profiles.continent,
              country: item.user_profiles.country,
              current_streak: item.current_streak,
              highest_streak: item.highest_streak
            }));
            
          setGlobalLeaders(processedGlobalData);
        }
        
        // Regional leaderboard
        const regionKey = regionFilter === 'continent' ? 'continent' : 'country';
        const regionValue = regionFilter === 'continent' ? selectedContinent : selectedCountry;
        
        query = supabase
          .from('user_streaks')
          .select(`
            id,
            current_streak,
            highest_streak,
            user_profiles:user_id (
              id,
              username,
              avatar_url,
              continent,
              country
            )
          `)
          .eq(`user_profiles.${regionKey}`, regionValue)
          .order('current_streak', { ascending: false })
          .limit(10);
          
        const { data: regionalData, error: regionalError } = await query;
        
        if (regionalError) {
          console.error("Error fetching regional leaderboard:", regionalError);
        } else {
          // Process the data
          const processedRegionalData = (regionalData || [])
            .filter(item => item.user_profiles)
            .map(item => ({
              id: item.user_profiles.id,
              username: item.user_profiles.username || 'Anonymous User',
              avatar_url: item.user_profiles.avatar_url || 'avatar-1.png',
              continent: item.user_profiles.continent,
              country: item.user_profiles.country,
              current_streak: item.current_streak,
              highest_streak: item.highest_streak
            }));
            
          setRegionalLeaders(processedRegionalData);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboards();
  }, [leaderboardType, regionFilter, selectedContinent, selectedCountry]);

  // Helper to get avatar image URL
  const getAvatarUrl = (key: string): string => {
    const avatarImages: Record<string, string> = {
      "avatar-1.png": "/lovable-uploads/c2a2d26c-0523-4fb9-9813-51aac4bc3987.png",
      "avatar-2.png": "/lovable-uploads/23786936-39a8-4e94-9eb3-3464ed7ffc82.png",
      "avatar-3.png": "/lovable-uploads/2bcde0f4-1483-4e84-a8e4-0227c5bdc9e8.png",
      "avatar-4.png": "/lovable-uploads/167baf60-e95c-4360-a687-d246ef45f33e.png",
      // Add remaining mappings as needed
    };
    
    return avatarImages[key] || 
      `https://api.dicebear.com/7.x/personas/svg?seed=${key}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4`;
  };

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
            src={getAvatarUrl(user.avatar_url)}
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


import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Map, Globe, Flag, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const LeaderboardSection = ({ 
  type, 
  continent, 
  country 
}: { 
  type: "global" | "local"; 
  continent?: string; 
  country?: string; 
}) => {
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [continents, setContinents] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedContinent, setSelectedContinent] = useState<string>(continent || "");
  const [selectedCountry, setSelectedCountry] = useState<string>(country || "");
  const [filter, setFilter] = useState<"current" | "highest">("current");

  // Fetch available continents and countries
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        // Get distinct continents
        const { data: continentData } = await supabase
          .from("user_profiles")
          .select("continent")
          .not("continent", "is", null)
          .eq("continent", continent)
          .limit(1);
          
        if (continentData && continentData.length > 0) {
          setContinents([continent as string]);
          setSelectedContinent(continent as string);
        } else {
          const { data: allContinents } = await supabase
            .from("user_profiles")
            .select("continent")
            .not("continent", "is", null)
            .order("continent")
            .limit(10);
            
          if (allContinents) {
            const distinctContinents = [...new Set(allContinents.map(c => c.continent))];
            setContinents(distinctContinents.filter(Boolean) as string[]);
            if (distinctContinents.length > 0 && !continent) {
              setSelectedContinent(distinctContinents[0] as string);
            }
          }
        }

        // Get countries for selected continent
        if (selectedContinent) {
          const { data: countryData } = await supabase
            .from("user_profiles")
            .select("country")
            .eq("continent", selectedContinent)
            .not("country", "is", null)
            .eq("country", country)
            .limit(1);
            
          if (countryData && countryData.length > 0) {
            setCountries([country as string]);
            setSelectedCountry(country as string);
          } else {
            const { data: allCountries } = await supabase
              .from("user_profiles")
              .select("country")
              .eq("continent", selectedContinent)
              .not("country", "is", null)
              .order("country")
              .limit(20);
              
            if (allCountries) {
              const distinctCountries = [...new Set(allCountries.map(c => c.country))];
              setCountries(distinctCountries.filter(Boolean) as string[]);
              if (distinctCountries.length > 0 && !country) {
                setSelectedCountry(distinctCountries[0] as string);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };

    if (type === "local") {
      fetchLocations();
    }
  }, [type, continent, country, selectedContinent]);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from("user_profiles")
          .select(`
            id,
            username,
            first_name,
            last_name,
            email,
            avatar_url,
            continent,
            country,
            user_streaks!inner(current_streak, highest_streak, current_title)
          `)
          .order(filter === "current" ? "user_streaks.current_streak" : "user_streaks.highest_streak", { ascending: false })
          .limit(10);

        // Apply location filters for local leaderboard
        if (type === "local") {
          if (selectedContinent) {
            query = query.eq("continent", selectedContinent);
            
            if (selectedCountry) {
              query = query.eq("country", selectedCountry);
            }
          }
        }

        const { data, error } = await query;

        if (error) throw error;
        
        // Format the data for display
        const formattedData = data.map(user => ({
          id: user.id,
          username: user.username || user.email.split('@')[0],
          name: user.first_name ? `${user.first_name} ${user.last_name || ''}` : null,
          email: user.email,
          avatar_url: user.avatar_url,
          current_streak: user.user_streaks.current_streak,
          highest_streak: user.user_streaks.highest_streak,
          current_title: user.user_streaks.current_title,
        }));

        setLeaderboardData(formattedData);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have location data for local leaderboard
    if (type === "global" || (type === "local" && (selectedContinent || selectedCountry))) {
      fetchLeaderboard();
    }
  }, [type, selectedContinent, selectedCountry, filter]);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          {type === "global" ? (
            <>
              <Globe className="h-5 w-5" />
              Global Leaderboard
            </>
          ) : (
            <>
              <Map className="h-5 w-5" />
              Local Leaderboard
            </>
          )}
        </CardTitle>
        
        <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-full sm:w-auto mt-4 sm:mt-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Current Streak</TabsTrigger>
            <TabsTrigger value="highest">Highest Streak</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent>
        {type === "local" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Continent
              </label>
              <Select 
                value={selectedContinent} 
                onValueChange={setSelectedContinent}
                disabled={continents.length === 0}
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
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Country
              </label>
              <Select 
                value={selectedCountry} 
                onValueChange={setSelectedCountry}
                disabled={!selectedContinent || countries.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedContinent ? "Select country" : "Select continent first"} />
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
          </div>
        )}
        
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading leaderboard...</div>
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground mb-2">No users found for this leaderboard</p>
            {type === "local" && (
              <p className="text-sm text-muted-foreground">
                Try selecting a different continent or country
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {leaderboardData.map((user, index) => (
              <div key={user.id} className="flex items-center p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-foreground font-bold">
                    {index + 1}
                  </div>
                  
                  <Avatar>
                    <AvatarImage src={`/lovable-uploads/${user.avatar_url || 'avatar-1.png'}`} alt={user.username} />
                    <AvatarFallback>
                      {user.name ? user.name.split(' ').map((n: string) => n[0]).join('') : user.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="ml-2">
                    <p className="font-medium">{user.username}</p>
                    {user.name && (
                      <p className="text-xs text-muted-foreground">{user.name}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Flame className="h-4 w-4 text-pink-500" />
                    <span>
                      {filter === "current" ? user.current_streak : user.highest_streak}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {user.current_title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaderboardSection;

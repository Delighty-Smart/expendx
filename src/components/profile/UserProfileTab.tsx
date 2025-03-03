
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Flame, Trophy, Calendar } from "lucide-react";
import AvatarSelector from "./AvatarSelector";
import { UserProfile } from "@/types/alerts";

const UserProfileTab = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("avatar-1.png");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [continent, setContinent] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [ageBracket, setAgeBracket] = useState<string>("");
  const [streak, setStreak] = useState({
    current: 0,
    highest: 0,
    title: ""
  });

  const continents = [
    'Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 
    'Australia/Oceania', 'South America'
  ];
  
  const countries = [
    'Nigeria', 'United States', 'United Kingdom', 'Canada', 'Australia',
    'Germany', 'France', 'Japan', 'China', 'India', 'Brazil', 'Mexico'
  ];
  
  const ageBrackets = [
    'Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
  ];

  // Fetch user profile and streak data
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You need to be logged in to view your profile");
          return;
        }
        
        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();
          
        if (profileError) {
          console.error("Error fetching profile:", profileError);
          toast.error("Could not load profile data");
          return;
        }
        
        // Fetch streak data
        const { data: streakData, error: streakError } = await supabase
          .from("user_streaks")
          .select("*")
          .eq("user_id", user.id)
          .single();
          
        if (streakError) {
          console.error("Error fetching streak:", streakError);
        }
        
        // Update state with fetched data
        setProfile(profileData);
        setUsername(profileData.username || "");
        setAvatarUrl(profileData.avatar_url || "avatar-1.png");
        setContinent(profileData.continent || "");
        setCountry(profileData.country || "");
        setAgeBracket(profileData.age_bracket || "");
        setBio(profileData.bio || "");
        
        if (streakData) {
          setStreak({
            current: streakData.current_streak || 0,
            highest: streakData.highest_streak || 0,
            title: streakData.current_title || ""
          });
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You need to be logged in to update your profile");
        return;
      }
      
      const { error } = await supabase
        .from("user_profiles")
        .update({
          username,
          avatar_url: avatarUrl,
          continent,
          country,
          age_bracket: ageBracket,
          bio
        })
        .eq("id", user.id);
        
      if (error) {
        console.error("Error updating profile:", error);
        toast.error("Failed to update profile");
        return;
      }
      
      toast.success("Profile updated successfully");
      setIsEditing(false);
      
      // Update the profile state
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          username,
          avatar_url: avatarUrl,
          continent,
          country,
          age_bracket: ageBracket,
          bio
        };
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading profile data...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Profile Information</CardTitle>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            ) : (
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={handleSaveProfile}>Save Changes</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
              <div className="w-32 h-32 rounded-full overflow-hidden flex-shrink-0">
                {isEditing ? (
                  <AvatarSelector 
                    selectedAvatar={avatarUrl} 
                    onSelectAvatar={(avatar) => setAvatarUrl(avatar)} 
                  />
                ) : (
                  <img 
                    src={AvatarSelector.getAvatarImageUrl(avatarUrl)} 
                    alt="Profile avatar" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-sm font-medium">Username</label>
                  {isEditing ? (
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                    />
                  ) : (
                    <p className="text-lg font-semibold">{profile?.username || "Anonymous User"}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-muted-foreground">{profile?.email}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Bio</label>
                  {isEditing ? (
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us a bit about yourself"
                      className="h-24"
                    />
                  ) : (
                    <p className="text-muted-foreground">{profile?.bio || "No bio provided"}</p>
                  )}
                </div>
              </div>
            </div>
            
            {isEditing && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Continent</label>
                  <Select
                    value={continent}
                    onValueChange={setContinent}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select continent" />
                    </SelectTrigger>
                    <SelectContent>
                      {continents.map(c => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <Select
                    value={country}
                    onValueChange={setCountry}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(c => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Age Bracket</label>
                  <Select
                    value={ageBracket}
                    onValueChange={setAgeBracket}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select age range" />
                    </SelectTrigger>
                    <SelectContent>
                      {ageBrackets.map(age => (
                        <SelectItem key={age} value={age}>
                          {age}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {!isEditing && (
              <div className="grid gap-2 sm:grid-cols-3 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Continent:</span>
                  <span className="text-muted-foreground">{profile?.continent || "Not specified"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Country:</span>
                  <span className="text-muted-foreground">{profile?.country || "Not specified"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Age Group:</span>
                  <span className="text-muted-foreground">{profile?.age_bracket || "Not specified"}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Streak Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="border rounded-md p-4 flex flex-col items-center">
              <div className="flex items-center mb-2 text-orange-500">
                <Flame className="h-6 w-6 mr-1" />
                <span className="text-xl font-bold">{streak.current}</span>
              </div>
              <p className="text-sm text-muted-foreground">Current Streak</p>
            </div>
            
            <div className="border rounded-md p-4 flex flex-col items-center">
              <div className="flex items-center mb-2 text-yellow-500">
                <Trophy className="h-6 w-6 mr-1" />
                <span className="text-xl font-bold">{streak.highest}</span>
              </div>
              <p className="text-sm text-muted-foreground">Highest Streak</p>
            </div>
            
            <div className="border rounded-md p-4 flex flex-col items-center">
              <div className="flex items-center mb-2">
                <Calendar className="h-6 w-6 mr-1" />
                <span className="text-xl font-bold">{streak.title}</span>
              </div>
              <p className="text-sm text-muted-foreground">Current Title</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfileTab;

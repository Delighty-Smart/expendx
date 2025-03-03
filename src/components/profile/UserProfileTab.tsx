
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Flame, Trophy } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import AvatarSelector from "./AvatarSelector";
import { STREAK_MILESTONES } from "@/lib/streak";
import { getStreakText } from "@/lib/streak";

// Define continents and age brackets
const CONTINENTS = [
  "Africa",
  "Antarctica",
  "Asia",
  "Europe",
  "North America",
  "Oceania",
  "South America",
];

const AGE_BRACKETS = [
  "Under 18",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+"
];

// A list of countries
const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "China",
  "India",
  "Brazil",
  "Nigeria",
  "South Africa",
  "Mexico",
  "Russia",
  "Italy",
  // Add more countries as needed
];

const UserProfileTab = () => {
  const [profile, setProfile] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("avatar-1.png");
  const [continent, setContinent] = useState("");
  const [country, setCountry] = useState("");
  const [ageBracket, setAgeBracket] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch user profile and streak data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You must be logged in to view your profile");
          return;
        }

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          toast.error("Failed to load profile data");
          return;
        }

        // Get user streak
        const { data: streakData, error: streakError } = await supabase
          .from("user_streaks")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (streakError) {
          console.error("Error fetching streak:", streakError);
          toast.error("Failed to load streak data");
          return;
        }

        setProfile(profileData);
        setStreak(streakData);

        // Set form state with profile data
        if (profileData) {
          setUsername(profileData.username || "");
          setAvatarUrl(profileData.avatar_url || "avatar-1.png");
          setContinent(profileData.continent || "");
          setCountry(profileData.country || "");
          setAgeBracket(profileData.age_bracket || "");
          setBio(profileData.bio || "");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to update your profile");
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
          bio,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error updating profile:", error);
        toast.error("Failed to update profile");
        return;
      }

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading profile data...</div>;
  }

  // Find the next milestone
  const currentStreak = streak?.current_streak || 0;
  const nextMilestone = STREAK_MILESTONES.find(m => m.days > currentStreak);

  // Calculate progress to next milestone
  const prevMilestoneDays = nextMilestone 
    ? STREAK_MILESTONES[STREAK_MILESTONES.indexOf(nextMilestone) - 1]?.days || 0
    : STREAK_MILESTONES[STREAK_MILESTONES.length - 2]?.days || 0;
    
  const nextMilestoneDays = nextMilestone?.days || STREAK_MILESTONES[STREAK_MILESTONES.length - 1].days;
  const progressPercent = Math.round(((currentStreak - prevMilestoneDays) / (nextMilestoneDays - prevMilestoneDays)) * 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="mb-4">
                <Label htmlFor="username" className="text-base">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="mb-4">
                <Label htmlFor="continent" className="text-base">Continent</Label>
                <Select value={continent} onValueChange={setContinent}>
                  <SelectTrigger id="continent" className="mt-1">
                    <SelectValue placeholder="Select continent" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTINENTS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <Label htmlFor="country" className="text-base">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id="country" className="mt-1">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <Label htmlFor="ageBracket" className="text-base">Age Range</Label>
                <Select value={ageBracket} onValueChange={setAgeBracket}>
                  <SelectTrigger id="ageBracket" className="mt-1">
                    <SelectValue placeholder="Select age range" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_BRACKETS.map((bracket) => (
                      <SelectItem key={bracket} value={bracket}>{bracket}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <Label htmlFor="bio" className="text-base">About me</Label>
                <Input
                  id="bio"
                  placeholder="Tell us a bit about yourself"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-base block mb-2">Select Avatar</Label>
              <AvatarSelector 
                selectedAvatar={avatarUrl} 
                onChange={setAvatarUrl} 
              />
            </div>
          </div>

          <Button 
            onClick={handleSaveProfile} 
            disabled={saving}
            className="w-full md:w-auto"
          >
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4">Streak Information</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Flame className="h-6 w-6 text-orange-500" />
                <span className="text-lg font-medium">Current Streak: {getStreakText(streak?.current_streak || 0)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <span className="text-lg font-medium">Highest Streak: {getStreakText(streak?.highest_streak || 0)}</span>
              </div>
              
              <div className="mt-2">
                <h3 className="text-lg font-medium">Current Title:</h3>
                <div className="p-2 bg-primary/10 rounded-md mt-1">
                  <p className="text-xl font-bold text-primary">{streak?.current_title || "Budget Beginner"}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Streak Progress</h3>
              {nextMilestone ? (
                <>
                  <div className="mb-2">
                    <p>Progress to {nextMilestone.title}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-1">
                      <div 
                        className="bg-primary h-2.5 rounded-full" 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentStreak} / {nextMilestone.days} days ({progressPercent}%)
                    </p>
                  </div>
                  <p className="text-sm">
                    You need {nextMilestone.days - currentStreak} more days to reach {nextMilestone.title}
                  </p>
                </>
              ) : (
                <p>Congratulations! You've reached the highest milestone: {STREAK_MILESTONES[STREAK_MILESTONES.length - 1].title}</p>
              )}
              
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">All Milestones</h3>
                <div className="space-y-2">
                  {STREAK_MILESTONES.map((milestone) => {
                    const isCompleted = currentStreak >= milestone.days;
                    const isCurrent = streak?.current_title === milestone.title;
                    
                    return (
                      <div 
                        key={milestone.title} 
                        className={`p-2 rounded-md border ${
                          isCurrent 
                            ? 'border-primary bg-primary/10' 
                            : isCompleted 
                              ? 'border-green-500 bg-green-500/10' 
                              : 'border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <p className={`font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-green-500' : ''}`}>
                            {milestone.title}
                          </p>
                          <span className="text-sm text-muted-foreground">
                            {getStreakText(milestone.days)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfileTab;
